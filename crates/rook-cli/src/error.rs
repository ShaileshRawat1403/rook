use std::process::ExitCode;
use std::process::Termination;

#[derive(Debug)]
pub struct CliError {
    pub exit_code: u8,
    pub message: String,
    pub cause: Option<String>,
    pub hint: Option<String>,
}

impl CliError {
    pub fn new(exit_code: u8, message: impl Into<String>) -> Self {
        Self {
            exit_code,
            message: message.into(),
            cause: None,
            hint: None,
        }
    }

    pub fn with_cause(mut self, cause: impl Into<String>) -> Self {
        self.cause = Some(cause.into());
        self
    }

    pub fn with_hint(mut self, hint: impl Into<String>) -> Self {
        self.hint = Some(hint.into());
        self
    }

    pub fn print(&self) {
        use std::io::Write;
        let stderr = std::io::stderr();
        let mut stderr = stderr.lock();

        let _ = writeln!(stderr, "error: {}", self.message);

        if let Some(cause) = &self.cause {
            let _ = writeln!(stderr, "  caused by: {cause}");
        }

        if let Some(hint) = &self.hint {
            let _ = writeln!(stderr, "  hint: {hint}");
        }
    }
}

impl std::fmt::Display for CliError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)?;
        if let Some(cause) = &self.cause {
            write!(f, "\n  caused by: {cause}")?;
        }
        if let Some(hint) = &self.hint {
            write!(f, "\n  hint: {hint}")?;
        }
        Ok(())
    }
}

impl std::error::Error for CliError {}

pub fn exit_code_from_err(err: &anyhow::Error) -> u8 {
    if err.downcast_ref::<CliError>().is_some() {
        return 1;
    }

    if err.downcast_ref::<std::io::Error>().is_some() {
        return 2;
    }

    if err.downcast_ref::<std::fmt::Error>().is_some() {
        return 3;
    }

    1
}

impl Termination for CliError {
    fn report(self) -> ExitCode {
        self.print();
        ExitCode::from(self.exit_code)
    }
}

impl From<std::io::Error> for CliError {
    fn from(err: std::io::Error) -> Self {
        Self::new(2, format!("IO error: {}", err))
    }
}

impl From<anyhow::Error> for CliError {
    fn from(err: anyhow::Error) -> Self {
        let exit_code = exit_code_from_err(&err);
        let message = err.to_string();
        Self::new(exit_code, message)
    }
}

pub trait CliResult<T> {
    fn cli_err(self) -> Result<T, CliError>;
}

impl<T, E: std::error::Error + Send + Sync + 'static> CliResult<T> for Result<T, E> {
    fn cli_err(self) -> Result<T, CliError> {
        match self {
            Ok(v) => Ok(v),
            Err(e) => Err(CliError::from(anyhow::anyhow!("{}", e))),
        }
    }
}

impl<T> CliResult<T> for Option<T> {
    fn cli_err(self) -> Result<T, CliError> {
        match self {
            Some(v) => Ok(v),
            None => Err(CliError::new(1, "required value was not provided")),
        }
    }
}
