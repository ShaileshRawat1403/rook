import Link from "@docusaurus/Link";
import { IconDownload } from "@site/src/components/icons/download";

const WindowsDesktopInstallButtons = () => {
  return (
    <div>
      <p>Click one of the buttons below to download rook Desktop for Windows:</p>
      <div className="pill-button">
        <Link
          className="button button--primary button--lg"
          to="https://github.com/ShaileshRawat1403/rook/releases/download/stable/Rook-win32-x64.zip"
        >
          <IconDownload /> Windows
        </Link>
      </div>
    </div>
  );
};

export default WindowsDesktopInstallButtons;
