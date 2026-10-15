import React, { Fragment, useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import * as Icons from "@heroicons/react/24/outline";

interface OpenControl {
  isOpen: boolean;
  close: (focus?: boolean) => void;
}
interface SelectConfig {
  beforeOpen?: (controller: SelectController) => void;
  onOpen?: (controller: SelectController) => void;
  onClose?: (controller: SelectController) => void;
}
export interface SelectController extends OpenControl {
  root: HTMLElement;
  select: HTMLSelectElement;
  button: HTMLButtonElement | null;
  panel: HTMLElement | null;
  value: HTMLElement | null;
  config: SelectConfig;
  labelId?: string;
  sync: () => void;
  refresh: () => void;
  destroy: () => void;
}
const openControls = new Set<OpenControl>();
const selects = new WeakMap<HTMLSelectElement, SelectController>();
function OpenState({
  controller,
  open,
}: {
  controller: SelectController;
  open: boolean;
}) {
  useLayoutEffect(() => {
    controller.isOpen = open;
    if (open) controller.config.onOpen?.(controller);
    else controller.config.onClose?.(controller);
  }, [controller, open]);
  return null;
}
function Select({ controller }: { controller: SelectController }) {
  const { select, labelId } = controller;
  return (
    <Listbox
      value={select.value}
      disabled={select.disabled}
      onChange={(value) => {
        select.value = value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        controller.sync();
      }}
    >
      {({ open }) => (
        <>
          <OpenState controller={controller} open={open} />
          <ListboxButton
            ref={(node) => {
              controller.button = node;
            }}
            id={select.id + "-button"}
            className="listbox-button edge-headless-button"
            aria-labelledby={
              labelId ? labelId + " " + select.id + "-button-value" : undefined
            }
            aria-label={
              labelId
                ? undefined
                : select.getAttribute("aria-label") || "انتخاب گزینه"
            }
            aria-invalid={
              select.getAttribute("aria-invalid") === "true" || undefined
            }
            aria-describedby={
              select.getAttribute("aria-describedby") || undefined
            }
            onPointerDown={() => controller.config.beforeOpen?.(controller)}
            onKeyDown={() => controller.config.beforeOpen?.(controller)}
          >
            <span
              id={select.id + "-button-value"}
              ref={(node) => {
                controller.value = node;
              }}
            >
              {select.selectedOptions[0]?.textContent || "انتخاب کن"}
            </span>
            <Icons.ChevronDownIcon
              className="edge-icon edge-chevron"
              aria-hidden="true"
            />
          </ListboxButton>
          <ListboxOptions
            ref={(node) => {
              controller.panel = node;
            }}
            unmount={false}
            modal={false}
            className="listbox-options edge-headless-options"
            aria-label={select.getAttribute("aria-label") || "گزینه‌ها"}
          >
            {Array.from(select.options).map((option, index) => (
              <ListboxOption
                key={option.value + index}
                value={option.value}
                disabled={option.disabled}
                className="listbox-option edge-headless-option"
                data-value={option.value}
              >
                {({ selected }) => (
                  <>
                    <span>{option.textContent}</span>
                    <Icons.CheckIcon
                      className="edge-icon edge-option-check"
                      aria-hidden="true"
                      style={{ visibility: selected ? "visible" : "hidden" }}
                    />
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </>
      )}
    </Listbox>
  );
}
export function mountSelect(
  select: HTMLSelectElement,
  config: SelectConfig = {},
): SelectController {
  const previous = selects.get(select);
  if (previous) {
    previous.config = config;
    previous.refresh();
    return previous;
  }
  const host = document.createElement("div");
  host.className = "listbox-root edge-select";
  select.after(host);
  const oldHidden = select.getAttribute("aria-hidden"),
    oldIndex = select.getAttribute("tabindex");
  select.classList.add("headless-source");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  const label = document.querySelector<HTMLLabelElement>(
    'label[for="' + CSS.escape(select.id) + '"]',
  );
  if (label) {
    label.id ||= select.id + "-button-label";
    label.htmlFor = select.id + "-button";
  }
  const root = createRoot(host);
  let destroyed = false;
  const sync = () => {
    if (!destroyed)
      flushSync(() => root.render(<Select controller={controller} />));
  };
  const controller: SelectController = {
    root: host,
    select,
    config,
    button: null,
    panel: null,
    value: null,
    labelId: label?.id,
    isOpen: false,
    sync,
    refresh: sync,
    close(focus = false) {
      if (controller.isOpen)
        flushSync(() =>
          controller.panel?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            }),
          ),
        );
      if (focus) controller.button?.focus();
    },
    destroy() {
      destroyed = true;
      observer.disconnect();
      select.removeEventListener("change", sync);
      openControls.delete(controller);
      selects.delete(select);
      root.unmount();
      host.remove();
      select.classList.remove("headless-source");
      if (oldHidden === null) select.removeAttribute("aria-hidden");
      else select.setAttribute("aria-hidden", oldHidden);
      if (oldIndex === null) select.removeAttribute("tabindex");
      else select.setAttribute("tabindex", oldIndex);
    },
  };
  const observer = new MutationObserver(sync);
  observer.observe(select, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true,
  });
  select.addEventListener("change", sync);
  selects.set(select, controller);
  openControls.add(controller);
  sync();
  return controller;
}
interface MultiLegacy {
  root: HTMLDetailsElement;
  options: HTMLElement;
  summaryText: HTMLElement;
  search: HTMLInputElement;
  selectedOrder?: string[];
}
interface MultiController extends OpenControl {
  root: HTMLElement;
  legacy: MultiLegacy;
  config: { title?: string; fallback?: string };
  input: HTMLInputElement | null;
  button: HTMLButtonElement | null;
  refresh: () => void;
}
const multis = new WeakMap<MultiLegacy, MultiController>();
function MultiPicker({ controller }: { controller: MultiController }) {
  const [query, setQuery] = useState("");
  const { legacy, config } = controller;
  const choices = Array.from(
    legacy.options.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
  ).map((input) => ({
    input,
    value: input.value,
    label:
      input.closest("label")?.querySelector(".multi-option-copy > span")
        ?.textContent || input.value,
    description:
      input.closest("label")?.querySelector(".option-description")
        ?.textContent || "",
  }));
  const checked = choices
    .filter((choice) => choice.input.checked)
    .map((choice) => choice.value);
  const selected = [
    ...(legacy.selectedOrder || []).filter((id) => checked.includes(id)),
    ...checked.filter((id) => !legacy.selectedOrder?.includes(id)),
  ];
  const normalize = (text: string) =>
    text
      .normalize("NFKC")
      .toLocaleLowerCase("fa")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک");
  return (
    <Combobox
      value={selected}
      multiple
      immediate
      onChange={(values) => {
        const changed = choices.find(
          (choice) => values.includes(choice.value) !== choice.input.checked,
        );
        if (changed) {
          changed.input.checked = values.includes(changed.value);
          changed.input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        setQuery("");
        legacy.search.value = "";
        controller.refresh();
      }}
      onClose={() => {
        controller.isOpen = false;
        setQuery("");
        legacy.search.value = "";
      }}
    >
      {({ open }) => {
        controller.isOpen = open;
        return (
          <>
            <div className="edge-combobox-field">
              <ComboboxInput
                ref={(node) => {
                  controller.input = node;
                }}
                className="edge-combobox-input"
                aria-label={
                  (config.title || "گزینه‌ها") + " — انتخاب چند گزینه"
                }
                displayValue={() => legacy.summaryText.textContent || ""}
                onChange={(event) => {
                  setQuery(event.target.value);
                  legacy.search.value = event.target.value;
                }}
                autoComplete="off"
              />
              <ComboboxButton
                ref={(node) => {
                  controller.button = node;
                }}
                className="edge-combobox-toggle"
                aria-label={"گزینه‌های " + (config.title || "")}
              >
                <Icons.ChevronDownIcon
                  className="edge-icon"
                  aria-hidden="true"
                />
              </ComboboxButton>
            </div>
            <ComboboxOptions
              unmount={false}
              modal={false}
              className="edge-multi-options listbox-options"
            >
              {choices
                .filter((choice) =>
                  normalize(choice.label + " " + choice.description).includes(
                    normalize(query),
                  ),
                )
                .map((choice) => (
                  <ComboboxOption
                    key={choice.value}
                    value={choice.value}
                    className="edge-headless-option edge-multi-option"
                  >
                    {({ selected: active }) => (
                      <>
                        <Icons.CheckIcon
                          className="edge-icon edge-option-check"
                          aria-hidden="true"
                          style={{ visibility: active ? "visible" : "hidden" }}
                        />
                        <span className="multi-option-copy">
                          <span>{choice.label}</span>
                          {choice.description && (
                            <small className="option-description">
                              {choice.description}
                            </small>
                          )}
                        </span>
                      </>
                    )}
                  </ComboboxOption>
                ))}
            </ComboboxOptions>
            <p className="edge-multi-count" aria-live="polite">
              {new Intl.NumberFormat("fa").format(
                selected.filter((id) => id !== config.fallback).length,
              )}{" "}
              انتخاب
            </p>
          </>
        );
      }}
    </Combobox>
  );
}
export function mountMultiPicker(
  legacy: MultiLegacy,
  config: MultiController["config"] = {},
) {
  const previous = multis.get(legacy);
  if (previous) {
    previous.refresh();
    return previous;
  }
  const host = document.createElement("div");
  host.className = "edge-multi-picker";
  legacy.root.after(host);
  legacy.root.hidden = true;
  const quick = legacy.root.querySelector(".multi-quick-add");
  if (quick) {
    host.after(quick);
    quick.classList.add("edge-multi-quick-add");
  }
  const root = createRoot(host);
  const controller: MultiController = {
    root: host,
    legacy,
    config,
    input: null,
    button: null,
    isOpen: false,
    refresh: () =>
      flushSync(() => root.render(<MultiPicker controller={controller} />)),
    close(focus = false) {
      if (controller.isOpen)
        flushSync(() =>
          controller.input?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              bubbles: true,
              cancelable: true,
            }),
          ),
        );
      if (focus) controller.input?.focus();
    },
  };
  Object.defineProperty(legacy.root, "open", {
    configurable: true,
    get: () => controller.isOpen,
    set: (open: boolean) => {
      if (open) controller.button?.click();
      else controller.close();
    },
  });
  legacy.options.addEventListener("change", () =>
    queueMicrotask(controller.refresh),
  );
  new MutationObserver(controller.refresh).observe(legacy.options, {
    childList: true,
    subtree: true,
  });
  multis.set(legacy, controller);
  openControls.add(controller);
  controller.refresh();
  return controller;
}
interface DisclosureController {
  item: HTMLElement;
  panel: HTMLElement;
  button: HTMLButtonElement;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}
interface DisclosureConfig {
  trigger?: HTMLElement;
  panel?: HTMLElement;
  inline?: boolean;
  openLabel?: string;
  closedLabel?: string;
  onChange?: (open: boolean) => void;
}
const disclosures = new WeakMap<HTMLElement, DisclosureController>();
export function mountDisclosure(
  item: HTMLElement | null,
  config: DisclosureConfig = {},
) {
  if (!item) return null;
  const previous = disclosures.get(item);
  if (previous) return previous;
  const details = item instanceof HTMLDetailsElement;
  const trigger =
    config.trigger ||
    item.querySelector<HTMLElement>(
      details
        ? ":scope > summary"
        : ":scope > legend .accordion-trigger, :scope > .import-guide-trigger",
    );
  if (!trigger) return null;
  let container = item,
    panel =
      config.panel ||
      document.getElementById(trigger.getAttribute("aria-controls") || "");
  const initiallyOpen = details
    ? item.open
    : trigger.getAttribute("aria-expanded") === "true";
  if (details) {
    container = document.createElement("div");
    for (const attribute of item.attributes)
      container.setAttribute(attribute.name, attribute.value);
    item.replaceWith(container);
    while (item.firstChild) container.append(item.firstChild);
    panel = document.createElement("div");
    panel.className = "edge-disclosure-panel";
    for (const node of Array.from(container.childNodes))
      if (node !== trigger) panel.append(node);
    container.append(panel);
  }
  if (!panel) return null;
  panel.id ||=
    (container.id ||
      "disclosure-" + document.querySelectorAll(".edge-disclosure").length) +
    "-panel";
  const button = document.createElement("button");
  button.type = "button";
  button.id = trigger.id || panel.id + "-trigger";
  button.className =
    (details ? "edge-details-trigger" : trigger.className) +
    " edge-disclosure-trigger";
  while (trigger.firstChild) button.append(trigger.firstChild);
  button.querySelectorAll(".accordion-icon").forEach((node) => node.remove());
  const text = document.createElement("span");
  while (button.firstChild) text.append(button.firstChild);
  button.append(text);
  const icon = document.createElement("span");
  button.append(icon);
  mountIcon(icon, "chevron-down");
  trigger.replaceWith(button);
  container.classList.add("edge-disclosure");
  button.setAttribute("aria-controls", panel.id);
  const controller: DisclosureController = {
    item: container,
    panel,
    button,
    isOpen: initiallyOpen,
    setOpen(open) {
      controller.isOpen = Boolean(open);
      panel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      container.toggleAttribute("open", open);
      if (config.openLabel)
        text.textContent = open ? config.openLabel : config.closedLabel || "";
      config.onChange?.(open);
    },
  };
  button.addEventListener("click", () =>
    controller.setOpen(!controller.isOpen),
  );
  Object.defineProperty(container, "open", {
    configurable: true,
    get: () => controller.isOpen,
    set: controller.setOpen,
  });
  disclosures.set(item, controller);
  disclosures.set(container, controller);
  controller.setOpen(initiallyOpen);
  return controller;
}
interface ConfirmationCard {
  root: HTMLElement;
  name: HTMLElement;
  input: HTMLInputElement;
  history?: HTMLElement;
  retained?: HTMLElement;
  detailsField?: HTMLElement;
  directionField?: HTMLElement;
}
interface PopoverConfig {
  formId?: string;
  beforeOpen?: () => void;
  onClose?: () => void;
}
interface ConfirmationController extends OpenControl {
  button: HTMLButtonElement | null;
  panel: HTMLElement | null;
  enabled: boolean;
  visible: boolean;
  label: string;
  setOpen: (open: boolean) => void;
  sync: (values?: {
    label?: string;
    enabled?: boolean;
    visible?: boolean;
  }) => void;
  destroy: () => void;
}
const confirmations = new WeakMap<HTMLElement, ConfirmationController>();
function RetainedContent({ content }: { content: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.append(content);
  }, [content]);
  return <div ref={ref} />;
}
function ConfirmationPopover({
  controller,
  content,
  config,
}: {
  controller: ConfirmationController;
  content: HTMLElement;
  config: PopoverConfig;
}) {
  return (
    <Popover as={Fragment}>
      {({ open, close }) => {
        controller.isOpen = open;
        controller.close = (focus = false) => {
          close(focus ? controller.button || undefined : undefined);
          config.onClose?.();
        };
        return (
          <>
            <PopoverButton
              ref={(node) => {
                controller.button = node;
              }}
              disabled={!controller.enabled}
              className="confirmation-popover-trigger"
              aria-label={"تنظیمات " + controller.label}
              onClickCapture={() => config.beforeOpen?.()}
            >
              <Icons.ChevronDownIcon className="edge-icon" aria-hidden="true" />
            </PopoverButton>
            <PopoverPanel
              ref={(node) => {
                controller.panel = node;
              }}
              anchor={{ to: "bottom start", gap: 8, padding: 16 }}
              portal
              unmount={false}
              modal={false}
              dir="rtl"
              className="confirmation-popover-panel"
              aria-label={"تنظیمات " + controller.label}
              style={{ width: "min(400px, calc(100vw - 32px))", zIndex: 1200 }}
            >
              <RetainedContent content={content} />
              <button
                type="button"
                className="confirmation-popover-close"
                aria-label="بستن تنظیمات"
                onClick={() => controller.close(true)}
              >
                <Icons.XMarkIcon className="edge-icon" aria-hidden="true" />
              </button>
            </PopoverPanel>
          </>
        );
      }}
    </Popover>
  );
}
export function mountConfirmationPopover(
  card: ConfirmationCard,
  config: PopoverConfig = {},
) {
  const previous = confirmations.get(card.root);
  if (previous) return previous;
  const host = document.createElement("span");
  host.className = "confirmation-popover-host";
  card.root.append(host);
  const content = document.createElement("div");
  content.className = "confirmation-popover-fields";
  const originals: { node: HTMLElement; marker: Comment }[] = [];
  for (const node of [
    card.history,
    card.retained,
    card.detailsField,
    card.directionField,
  ])
    if (node) {
      const marker = document.createComment("retained-field");
      node.before(marker);
      content.append(node);
      originals.push({ node, marker });
    }
  content
    .querySelectorAll("input,select,textarea")
    .forEach((input) =>
      input.setAttribute("form", config.formId || "trade-form"),
    );
  const root = createRoot(host);
  const controller: ConfirmationController = {
    button: null,
    panel: null,
    isOpen: false,
    enabled: false,
    visible: false,
    label: card.name.textContent || card.input.value,
    close() {},
    setOpen(open) {
      if (open && !controller.isOpen)
        flushSync(() => controller.button?.click());
      else if (!open) controller.close();
    },
    sync(values = {}) {
      Object.assign(controller, values);
      host.hidden = !controller.visible;
      flushSync(() =>
        root.render(
          <ConfirmationPopover
            controller={controller}
            content={content}
            config={config}
          />,
        ),
      );
    },
    destroy() {
      originals.forEach(({ node, marker }) => marker.replaceWith(node));
      root.unmount();
      host.remove();
      confirmations.delete(card.root);
      openControls.delete(controller);
    },
  };
  confirmations.set(card.root, controller);
  openControls.add(controller);
  controller.sync();
  return controller;
}
const iconMap: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  home: Icons.HomeIcon,
  document: Icons.DocumentTextIcon,
  analysis: Icons.PresentationChartLineIcon,
  chart: Icons.ChartBarIcon,
  "chart-bar": Icons.ChartBarIcon,
  calculator: Icons.CalculatorIcon,
  wallet: Icons.WalletIcon,
  squares: Icons.Squares2X2Icon,
  settings: Icons.Cog6ToothIcon,
  plus: Icons.PlusIcon,
  menu: Icons.Bars3Icon,
  "arrow-left": Icons.ArrowLeftIcon,
  "arrow-right": Icons.ArrowRightIcon,
  "chevron-down": Icons.ChevronDownIcon,
  "chevron-right": Icons.ChevronRightIcon,
  "chevron-left": Icons.ChevronLeftIcon,
  close: Icons.XMarkIcon,
  ellipsis: Icons.EllipsisHorizontalIcon,
  calendar: Icons.CalendarDaysIcon,
  photo: Icons.PhotoIcon,
  download: Icons.ArrowDownTrayIcon,
  upload: Icons.ArrowUpTrayIcon,
  info: Icons.InformationCircleIcon,
  trash: Icons.TrashIcon,
  reset: Icons.ArrowPathIcon,
  edit: Icons.PencilSquareIcon,
  duplicate: Icons.DocumentDuplicateIcon,
  check: Icons.CheckIcon,
};
let iconTemplates: Map<string, SVGElement> | undefined;
function templates() {
  if (iconTemplates) return iconTemplates;
  const host = document.createElement("div"),
    root = createRoot(host);
  flushSync(() =>
    root.render(
      <>
        {Object.entries(iconMap).map(([name, Icon]) => (
          <span key={name} data-template={name}>
            <Icon className="heroicon edge-icon" aria-hidden="true" />
          </span>
        ))}
      </>,
    ),
  );
  iconTemplates = new Map(
    Array.from(host.querySelectorAll<HTMLElement>("[data-template]")).map(
      (node) => [
        node.dataset.template!,
        node.firstElementChild!.cloneNode(true) as SVGElement,
      ],
    ),
  );
  root.unmount();
  return iconTemplates;
}
export function mountIcon(host: HTMLElement, name: string) {
  host.replaceChildren(
    (templates().get(name) || templates().get("chart")!).cloneNode(true),
  );
}
const icons = {
  paint(host: HTMLElement, name = host.dataset.heroicon || "") {
    if (host.dataset.iconRendered !== name) {
      mountIcon(host, name);
      host.dataset.iconRendered = name;
    }
    return host;
  },
  element(name: string, className = "") {
    const host = document.createElement("span");
    host.className = "heroicon-host " + className;
    host.setAttribute("aria-hidden", "true");
    icons.paint(host, name);
    return host;
  },
  apply(root: ParentNode = document) {
    root
      .querySelectorAll<HTMLElement>("[data-heroicon]")
      .forEach((host) => icons.paint(host));
    return root;
  },
  decorate(button: HTMLElement, name: string, prepend = true) {
    if (!button.querySelector(':scope > [data-heroicon="' + name + '"]')) {
      const icon = icons.element(name);
      icon.dataset.heroicon = name;
      if (prepend) button.prepend(icon);
      else button.append(icon);
    }
    return button;
  },
};
export const controls = {
  mountSelect,
  mountMultiPicker,
  syncMultiPicker: (legacy: MultiLegacy) => multis.get(legacy)?.refresh(),
  mountDisclosure,
  setDisclosure: (item: HTMLElement, open: boolean) => {
    const controller = disclosures.get(item);
    if (!controller) return false;
    controller.setOpen(open);
    return true;
  },
  mountConfirmationPopover,
  closeConfirmationPopovers: (focus = false) =>
    openControls.forEach((controller) => {
      if (controller.isOpen && "enabled" in controller) controller.close(focus);
    }),
  closeAll: (focus = false) =>
    openControls.forEach((controller) => {
      if (controller.isOpen) controller.close(focus);
    }),
  applyIcons: icons.apply,
  mountIcon,
};
export function installControls() {
  globalThis.EdgeUI = controls;
  globalThis.EdgeIcons = icons;
}
declare global {
  var EdgeUI: typeof controls & {
    renderCharts?: (root: HTMLElement, data: unknown) => void;
  };
  var EdgeIcons: typeof icons;
}
