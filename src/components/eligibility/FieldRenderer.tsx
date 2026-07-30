import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { EligibilityFormData, FieldConfig } from "./questions";

interface FieldRendererProps {
  field: FieldConfig;
  data: EligibilityFormData;
  onChange: (key: string, value: string | string[]) => void;
  /** Hide the label for the field that the step title already asks. */
  hideLabel?: boolean;
}

const needsOther = (v: unknown) =>
  typeof v === "string" && (v === "Other" || v.includes("Other") || v.includes("Another nationality"));

const FieldRenderer = ({ field, data, onChange, hideLabel }: FieldRendererProps) => {
  const value = data[field.key];
  const otherKey = `${field.key}Other`;

  const labelBlock = !hideLabel && (
    <div className="space-y-1">
      <Label className="text-base font-semibold text-foreground">
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      {field.helper && <p className="text-sm text-muted-foreground">{field.helper}</p>}
    </div>
  );

  const otherInput = (placeholder: string) =>
    needsOther(value) ? (
      <Input
        className="mt-2"
        value={(data[otherKey] as string) || ""}
        placeholder={placeholder}
        onChange={(e) => onChange(otherKey, e.target.value)}
      />
    ) : null;

  if (field.type === "text") {
    return (
      <div className="space-y-2">
        {labelBlock}
        <Input
          value={(value as string) || ""}
          inputMode={field.inputMode}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="space-y-2">
        {labelBlock}
        <Select value={(value as string) || ""} onValueChange={(v) => onChange(field.key, v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {otherInput("Please specify")}
      </div>
    );
  }


  if (field.type === "radio") {
    return (
      <div className="space-y-3">
        {labelBlock}
        <div className="space-y-2.5">
          {field.options?.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(field.key, opt)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-4 py-3.5 text-left text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    selected ? "border-primary" : "border-muted-foreground/40",
                  )}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        {otherInput("Please specify")}
      </div>

    );
  }

  // multiselect
  const selectedValues = Array.isArray(value) ? value : [];
  const toggle = (opt: string) =>
    onChange(
      field.key,
      selectedValues.includes(opt) ? selectedValues.filter((v) => v !== opt) : [...selectedValues, opt],
    );

  return (
    <div className="space-y-3">
      {labelBlock}
      <div className="flex flex-wrap gap-2">
        {field.options?.map((opt) => {
          const selected = selectedValues.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {selected ? "✓ " : ""}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FieldRenderer;
