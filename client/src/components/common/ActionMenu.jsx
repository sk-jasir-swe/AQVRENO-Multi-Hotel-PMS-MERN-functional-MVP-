import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

export default function ActionMenu({
  items,
  label = "Actions",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const menuListRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  function updateMenuPosition() {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const menu = menuListRef.current;
    if (!trigger || !menu) return;
    const menuHeight = menu.getBoundingClientRect().height;
    const top =
      trigger.bottom + menuHeight + 4 > window.innerHeight
        ? trigger.top - menuHeight - 4
        : trigger.bottom + 4;
    setMenuPosition({
      top: Math.max(8, top),
      left: Math.max(
        8,
        Math.min(
          trigger.left,
          window.innerWidth - menu.getBoundingClientRect().width - 8,
        ),
      ),
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (
        !menuRef.current?.contains(event.target) &&
        !menuListRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (!menuListRef.current?.contains(event.target)) return;
      if (event.key === "Tab") {
        setOpen(false);
        return;
      }
      const menuItems = menuListRef.current.querySelectorAll(
        '[role="menuitem"]:not(:disabled)',
      );
      const currentIndex = Array.from(menuItems).indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const offset = event.key === "ArrowDown" ? 1 : -1;
        menuItems[
          (currentIndex + offset + menuItems.length) % menuItems.length
        ]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        menuItems[event.key === "Home" ? 0 : menuItems.length - 1]?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    menuListRef.current
      ?.querySelector('[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, [open]);

  const availableItems = items.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.label === "string" &&
      item.label.trim(),
  );
  if (!availableItems.length) return null;

  return (
    <div className="action-menu" ref={menuRef}>
      <button
        ref={triggerRef}
        className="action-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuListRef}
            className="action-menu-list"
            role="menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {availableItems.map((item) => {
              const className = `action-menu-item${item.danger ? " danger" : ""}`;
              const close = () => setOpen(false);
              return item.to ? (
                <Link
                  key={item.label}
                  className={className}
                  to={item.to}
                  role="menuitem"
                  onClick={close}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  className={className}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    close();
                    item.onClick?.();
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
