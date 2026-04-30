import { IconAlertTriangle, IconChecks, IconRoute } from "@tabler/icons-react";
import { Widget } from "@/features/chat/ui/widgets/Widget";
import { SAFE_LANES } from "./safeLanes";
import { useIntentStore } from "./intentStore";

interface IntentReadinessWidgetProps {
  sessionId: string;
}

function label(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function IntentReadinessWidget({
  sessionId,
}: IntentReadinessWidgetProps) {
  const intent = useIntentStore((s) => s.currentBySession[sessionId]);

  if (
    !intent ||
    (intent.executionPosture === "direct" && intent.risk === "low")
  ) {
    return null;
  }

  const lane = SAFE_LANES[intent.executionPosture];
  const isCritical = intent.risk === "critical";

  return (
    <Widget
      title="Readiness"
      icon={
        isCritical ? (
          <IconAlertTriangle className="size-3.5" />
        ) : (
          <IconRoute className="size-3.5" />
        )
      }
      action={
        <span className="text-xxs text-foreground-subtle">
          {label(intent.risk)}
        </span>
      }
    >
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
          <span className="text-foreground-subtle">Mode</span>
          <span className="text-foreground">{label(intent.mode)}</span>
          <span className="text-foreground-subtle">Posture</span>
          <span className="text-foreground">{lane.label}</span>
          <span className="text-foreground-subtle">Risk</span>
          <span className={isCritical ? "text-destructive" : "text-foreground"}>
            {label(intent.risk)}
          </span>
        </div>

        {intent.reasons.length > 0 ? (
          <div className="space-y-1">
            <div className="text-foreground-subtle">Why this posture</div>
            <ul className="space-y-1">
              {intent.reasons.slice(0, 3).map((reason) => (
                <li key={reason} className="text-foreground">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-start gap-1.5 text-foreground-subtle">
          <IconChecks className="mt-0.5 size-3 shrink-0" />
          <span>{lane.description}</span>
        </div>
      </div>
    </Widget>
  );
}
