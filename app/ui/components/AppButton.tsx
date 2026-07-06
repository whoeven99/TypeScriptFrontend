import { Button as AntButton } from "antd";
import type { ButtonProps } from "antd";

export type AppButtonProps = ButtonProps;

export default function AppButton({
  className,
  size = "middle",
  ...props
}: AppButtonProps) {
  const classes = ["app-button", className].filter(Boolean).join(" ");

  return <AntButton {...props} size={size} className={classes} />;
}
