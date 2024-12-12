import { useEffect, useState } from "react";
import { Modal, Input, Table, Space, message, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { FetcherWithComponents } from "@remix-run/react";
import { useDispatch, useSelector } from "react-redux";

interface GlossaryModalProps {
  
}

interface AddGlossaryType {
  key: number;
  isoCode: string;
  src: string[] | null;
  name: string;
  state: string;
}

const AddGlossaryModal: React.FC<GlossaryModalProps> = ({

}) => {

  return (
    <Modal
    //   title=""
    //   width={1000}
    //   open={isVisible}
    //   onCancel={handleCloseModal}
    //   footer={[
    //     <div key={"footer_buttons"}>
    //       <Button
    //         key={"manage_cancel_button"}
    //         onClick={handleCloseModal}
    //         style={{ marginRight: "10px" }}
    //       >
    //         Cancel
    //       </Button>
    //       <Button
    //         onClick={handleConfirm}
    //         key={"manage_confirm_button"}
    //         type="primary"
    //         disabled={confirmButtonDisable}
    //         loading={confirmButtonDisable}
    //       >
    //         Add
    //       </Button>
    //     </div>,
    //   ]}
    >
    
    </Modal>
  );
};

export default AddGlossaryModal;
