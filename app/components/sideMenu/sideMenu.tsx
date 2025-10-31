import React from "react";
import sideMenu from "./styles/sideMenu.module.css";

interface SideMenuItem {
  key: string;
  label: string;
}

interface SideMenuProps {
  items: SideMenuItem[];
  defaultSelectedKeys?: string;
  selectedKeys: string;
  onClick: (key: string) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({
  items,
  selectedKeys,
  onClick,
}) => {
  return (
    <div className={sideMenu.sideMenuWrap}>
      {items.map((item) => {
        const isActive = item?.key === selectedKeys;
        return (
          <div
            key={item.key}
            className={sideMenu.sideMenuItem}
            onClick={() => onClick(item?.key)}
            style={{
              backgroundColor: isActive ? "rgba(217, 217, 217, 0.7)" : "",
            }}
          >
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textAlign: "left",
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default SideMenu;
