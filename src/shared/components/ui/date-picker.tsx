"use client";

import { DatePicker as ArkDatePicker, parseDate } from "@ark-ui/react/date-picker";
import { Portal } from "@ark-ui/react/portal";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type DatePickerProps = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  controlClassName?: string;
};

function toDateValues(isoDate?: string) {
  if (!isoDate) return [];
  try {
    return [parseDate(isoDate)];
  } catch {
    return [];
  }
}

export function DatePicker({
  id,
  name,
  label,
  value,
  defaultValue,
  onChange,
  placeholder = "Pilih tanggal",
  disabled,
  className,
  controlClassName,
}: DatePickerProps) {
  const isControlled = value !== undefined;

  return (
    <ArkDatePicker.Root
      id={id}
      name={name}
      locale="id-ID"
      timeZone="Asia/Jakarta"
      startOfWeek={1}
      disabled={disabled}
      value={isControlled ? toDateValues(value) : undefined}
      defaultValue={!isControlled ? toDateValues(defaultValue) : undefined}
      onValueChange={(details) => {
        onChange?.(details.valueAsString[0] ?? "");
      }}
      className={cn("w-full", className)}
    >
      {label ? (
        <ArkDatePicker.Label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </ArkDatePicker.Label>
      ) : null}

      <ArkDatePicker.Control
        className={cn(
          "flex h-8 w-full items-center gap-1 rounded-lg border border-input bg-transparent px-2 shadow-none transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
          disabled && "pointer-events-none opacity-50",
          controlClassName,
        )}
      >
        <ArkDatePicker.Input
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
        />
        <ArkDatePicker.Trigger className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
          <Calendar className="size-3.5" />
        </ArkDatePicker.Trigger>
        <ArkDatePicker.ClearTrigger className="inline-flex size-6 items-center justify-center rounded-md text-destructive hover:bg-destructive/10">
          <X className="size-3.5" />
        </ArkDatePicker.ClearTrigger>
      </ArkDatePicker.Control>

      <Portal>
        {/* Above modal overlays (z-50) so calendar is not trapped behind "Catat lot" popup */}
        <ArkDatePicker.Positioner className="z-[110]">
          <ArkDatePicker.Content className="w-[min(100vw-2rem,20rem)] rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none">
            <div className="mb-3 flex gap-2">
              <ArkDatePicker.YearSelect className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
              <ArkDatePicker.MonthSelect className="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-sm text-foreground" />
            </div>

            <ArkDatePicker.View view="day">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <ArkDatePicker.ViewControl className="mb-2 flex items-center justify-between text-sm font-medium text-foreground">
                      <ArkDatePicker.PrevTrigger className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted">
                        <ChevronLeft className="size-4" />
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger className="rounded-md px-2 py-1 hover:bg-muted">
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted">
                        <ChevronRight className="size-4" />
                      </ArkDatePicker.NextTrigger>
                    </ArkDatePicker.ViewControl>

                    <ArkDatePicker.Table className="w-full text-center text-sm">
                      <ArkDatePicker.TableHead>
                        <ArkDatePicker.TableRow>
                          {datePicker.weekDays.map((weekDay, index) => (
                            <ArkDatePicker.TableHeader
                              key={index}
                              className="py-1 text-xs font-medium text-muted-foreground"
                            >
                              {weekDay.short}
                            </ArkDatePicker.TableHeader>
                          ))}
                        </ArkDatePicker.TableRow>
                      </ArkDatePicker.TableHead>
                      <ArkDatePicker.TableBody>
                        {datePicker.weeks.map((week, weekIndex) => (
                          <ArkDatePicker.TableRow key={weekIndex}>
                            {week.map((day, dayIndex) => (
                              <ArkDatePicker.TableCell key={dayIndex} value={day}>
                                <ArkDatePicker.TableCellTrigger
                                  className={cn(
                                    "mx-auto flex size-9 items-center justify-center rounded-lg text-sm transition-colors",
                                    "hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring",
                                    "data-selected:bg-primary data-selected:text-primary-foreground",
                                    "data-today:font-semibold data-today:underline data-today:underline-offset-2",
                                    "data-outside-range:text-muted-foreground/40",
                                    "data-disabled:pointer-events-none data-disabled:opacity-40",
                                  )}
                                >
                                  {day.day}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>

            <ArkDatePicker.View view="month">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <ArkDatePicker.ViewControl className="mb-2 flex items-center justify-between">
                      <ArkDatePicker.PrevTrigger className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted">
                        <ChevronLeft className="size-4" />
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger className="rounded-md px-2 py-1 hover:bg-muted">
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted">
                        <ChevronRight className="size-4" />
                      </ArkDatePicker.NextTrigger>
                    </ArkDatePicker.ViewControl>
                    <ArkDatePicker.Table className="w-full text-sm">
                      <ArkDatePicker.TableBody>
                        {datePicker.getMonthsGrid({ columns: 4, format: "short" }).map((months, rowIndex) => (
                          <ArkDatePicker.TableRow key={rowIndex}>
                            {months.map((month, monthIndex) => (
                              <ArkDatePicker.TableCell key={monthIndex} value={month.value}>
                                <ArkDatePicker.TableCellTrigger className="w-full rounded-lg px-2 py-2 hover:bg-primary/10 data-selected:bg-primary data-selected:text-primary-foreground">
                                  {month.label}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>

            <ArkDatePicker.View view="year">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <ArkDatePicker.ViewControl className="mb-2 flex items-center justify-between">
                      <ArkDatePicker.PrevTrigger className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted">
                        <ChevronLeft className="size-4" />
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger className="rounded-md px-2 py-1 hover:bg-muted">
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted">
                        <ChevronRight className="size-4" />
                      </ArkDatePicker.NextTrigger>
                    </ArkDatePicker.ViewControl>
                    <ArkDatePicker.Table className="w-full text-sm">
                      <ArkDatePicker.TableBody>
                        {datePicker.getYearsGrid({ columns: 4 }).map((years, rowIndex) => (
                          <ArkDatePicker.TableRow key={rowIndex}>
                            {years.map((year, yearIndex) => (
                              <ArkDatePicker.TableCell key={yearIndex} value={year.value}>
                                <ArkDatePicker.TableCellTrigger className="w-full rounded-lg px-2 py-2 hover:bg-primary/10 data-selected:bg-primary data-selected:text-primary-foreground">
                                  {year.label}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
          </ArkDatePicker.Content>
        </ArkDatePicker.Positioner>
      </Portal>
    </ArkDatePicker.Root>
  );
}

/** Demo-compatible alias from the integration prompt. */
export const Basic = () => (
  <div className="mx-auto w-full max-w-md p-4">
    <DatePicker label="Pilih tanggal" placeholder="Pilih tanggal" />
  </div>
);
