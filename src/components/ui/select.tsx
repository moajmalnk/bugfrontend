import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

function collectText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(collectText).join(" ")
  if (React.isValidElement(node)) {
    return collectText(
      (node.props as { children?: React.ReactNode })?.children
    )
  }
  return ""
}

function getDisplayName(type: unknown): string | undefined {
  if (!type || (typeof type !== "object" && typeof type !== "function")) {
    return undefined
  }
  return (
    (type as { displayName?: string; name?: string }).displayName ||
    (type as { name?: string }).name
  )
}

/** Radix Select.Item rows always expose a `value` prop. */
function isSelectItemElement(child: React.ReactElement): boolean {
  const name = getDisplayName(child.type)
  if (
    name === "SelectGroup" ||
    name === "Group" ||
    name === "SelectLabel" ||
    name === "Label" ||
    name === "SelectSeparator" ||
    name === "Separator" ||
    name === "SelectScrollUpButton" ||
    name === "SelectScrollDownButton"
  ) {
    return false
  }
  if (name === "SelectItem" || name === "Item") return true
  const value = (child.props as { value?: unknown })?.value
  return typeof value === "string" || typeof value === "number"
}

function isSelectGroupElement(child: React.ReactElement): boolean {
  const name = getDisplayName(child.type)
  return name === "SelectGroup" || name === "Group"
}

function filterSelectChildren(
  children: React.ReactNode,
  query: string
): { nodes: React.ReactNode; matchCount: number } {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return { nodes: children, matchCount: -1 }
  }

  let matchCount = 0

  const filtered = React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) {
      return []
    }

    if (isSelectItemElement(child)) {
      const props = child.props as {
        value?: string | number
        children?: React.ReactNode
        textValue?: string
      }
      const haystack = [
        props.textValue,
        props.value != null ? String(props.value) : "",
        collectText(props.children),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .trim()
      if (haystack.includes(normalized)) {
        matchCount += 1
        return [child]
      }
      return []
    }

    if (isSelectGroupElement(child) || child.props?.children != null) {
      const nested = filterSelectChildren(
        (child.props as { children?: React.ReactNode }).children,
        normalized
      )
      if (nested.matchCount > 0) {
        matchCount += nested.matchCount
        return [
          React.cloneElement(
            child,
            undefined,
            nested.nodes
          ),
        ]
      }
      // Non-item wrappers with no matching descendants (labels, separators, etc.)
      if (!isSelectGroupElement(child) && !isSelectItemElement(child)) {
        const name = getDisplayName(child.type)
        if (name === "SelectSeparator" || name === "Separator") return []
        if (name === "SelectLabel" || name === "Label") return []
      }
      return []
    }

    return [child]
  })

  return { nodes: filtered, matchCount }
}

type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof SelectPrimitive.Content
> & {
  /** Show an inline search box (default: true). */
  searchable?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      position = "popper",
      searchable = true,
      searchPlaceholder = "Search...",
      emptyMessage = "No results found.",
      onCloseAutoFocus,
      onOpenAutoFocus,
      onKeyDown,
      onKeyDownCapture,
      ...props
    },
    ref
  ) => {
    const [search, setSearch] = React.useState("")
    const inputRef = React.useRef<HTMLInputElement>(null)
    const searchRef = React.useRef(search)
    searchRef.current = search

    const focusSearch = React.useCallback(() => {
      const el = inputRef.current
      if (!el) return
      if (document.activeElement !== el) {
        el.focus({ preventScroll: true })
      }
      const len = el.value.length
      try {
        el.setSelectionRange(len, len)
      } catch {
        // ignore unsupported input types
      }
    }, [])

    const scheduleFocusSearch = React.useCallback(() => {
      // Radix re-focuses items after filter updates; restore after paint.
      focusSearch()
      requestAnimationFrame(() => focusSearch())
    }, [focusSearch])

    React.useEffect(() => {
      if (!searchable) return
      setSearch("")
      const id = window.setTimeout(() => scheduleFocusSearch(), 0)
      return () => window.clearTimeout(id)
    }, [searchable, scheduleFocusSearch])

    const { nodes: filteredChildren, matchCount } = React.useMemo(
      () =>
        searchable
          ? filterSelectChildren(children, search)
          : { nodes: children, matchCount: -1 },
      [children, search, searchable]
    )

    // Keep the search field focused while the filtered list updates.
    React.useLayoutEffect(() => {
      if (!searchable) return
      scheduleFocusSearch()
    }, [search, matchCount, searchable, scheduleFocusSearch])

    const showEmpty =
      searchable && search.trim().length > 0 && matchCount === 0

    const isSearchField = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return Boolean(
        el &&
          (el === inputRef.current ||
            el.tagName === "INPUT" ||
            el.closest?.("[data-select-search]"))
      )
    }

    return (
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          ref={ref}
          className={cn(
            "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            position === "popper" &&
              "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className
          )}
          position={position}
          {...props}
          onOpenAutoFocus={(event) => {
            if (searchable) {
              event.preventDefault()
              scheduleFocusSearch()
            }
            onOpenAutoFocus?.(event)
          }}
          onCloseAutoFocus={(event) => {
            onCloseAutoFocus?.(event)
          }}
          onKeyDownCapture={
            searchable
              ? (event) => {
                  onKeyDownCapture?.(event)
                  if (event.defaultPrevented) return

                  // Never let Radix typeahead steal keystrokes from the search field.
                  if (isSearchField(event.target)) {
                    event.stopPropagation()
                    return
                  }

                  // If focus left the input, still type into search instead of typeahead.
                  const { key } = event
                  const isPrintable =
                    key.length === 1 &&
                    !event.ctrlKey &&
                    !event.metaKey &&
                    !event.altKey
                  if (isPrintable || key === "Backspace" || key === "Delete") {
                    event.preventDefault()
                    event.stopPropagation()
                    setSearch((prev) => {
                      if (key === "Backspace") return prev.slice(0, -1)
                      if (key === "Delete") return prev
                      return prev + key
                    })
                    scheduleFocusSearch()
                  }
                }
              : onKeyDownCapture
          }
          onKeyDown={onKeyDown}
        >
          {searchable ? (
            <div
              data-select-search=""
              className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/70 bg-popover px-2 py-1.5"
              onPointerDown={(event) => {
                // Keep the menu open and avoid Radix focusing an item.
                event.preventDefault()
                event.stopPropagation()
                scheduleFocusSearch()
              }}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={searchPlaceholder}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onKeyDown={(event) => {
                  event.stopPropagation()
                  if (event.key === "Escape") {
                    if (searchRef.current) {
                      event.preventDefault()
                      setSearch("")
                    }
                  }
                }}
                onKeyUp={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}

          <SelectScrollUpButton />
          <SelectPrimitive.Viewport
            className={cn(
              "p-1",
              position === "popper" &&
                "w-full min-w-[var(--radix-select-trigger-width)] max-h-[min(20rem,var(--radix-select-content-available-height))]"
            )}
          >
            {showEmpty ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredChildren
            )}
          </SelectPrimitive.Viewport>
          <SelectScrollDownButton />
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    )
  }
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    /** Shown in the menu only — not mirrored into the trigger value. */
    description?: string
  }
>(({ className, children, description, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      description ? "items-start py-2" : "items-center",
      className
    )}
    {...props}
  >
    <span
      className={cn(
        "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
        description ? "top-2.5" : "top-1/2 -translate-y-1/2"
      )}
    >
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <div className="flex min-w-0 flex-col gap-0.5">
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {description ? (
        <span className="text-[11px] font-normal leading-snug text-muted-foreground">
          {description}
        </span>
      ) : null}
    </div>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
