import { Modal, Button, Checkbox, Typography } from "antd";
import { useTranslation } from "react-i18next";

const { Text } = Typography;

interface DeleteConfirmModalProps {
    isVisible: boolean;
    setVisible: (visible: boolean) => void;
    setDontPromptAgain: (dontPromptAgain: boolean) => void;
    handleDelete: () => void;
    langauges: any;
    text: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isVisible,
    setVisible,
    setDontPromptAgain,
    handleDelete,
    langauges = [],
    text,
}) => {
    const { t } = useTranslation();

    return (
        <Modal
            title={langauges.length > 1 ? t("Delete {{count}} languages", { count: langauges.length }) : t("Delete {{item}}", { item: langauges[0]?.name })}
            width={1000}
            open={isVisible}
            onCancel={() => setVisible(false)}
            footer={[
                <div
                    key={"footer_buttons"}
                >
                    <Button
                        key={"manage_cancel_button"}
                        style={{ marginRight: "10px" }}
                        onClick={() => setVisible(false)}
                    >
                        {t("No")}
                    </Button>
                    <Button
                        onClick={handleDelete}
                        key={"manage_confirm_button"}
                        type="primary"
                    >
                        {t("Yes")}
                    </Button>
                </div>
            ]}
            style={{ top: "40%" }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Text>
                    {text}
                </Text>
                <Checkbox onChange={(e) => setDontPromptAgain(e.target.checked)}>
                    {t("Don’t prompt again next time")}
                </Checkbox>
            </div>
        </Modal>
    );
};

export default DeleteConfirmModal;
