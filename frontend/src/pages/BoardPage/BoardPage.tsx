import { useState, useEffect } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../client";
import Content from "./BoardPage.Content";
import CommentList from "./BoardPage.CommentList";
import useAuthStore from "../../store/useAuthStore";
import DeleteModal from "./BoardPage.DeleteModal";

interface Board {
  boardId: number;
  contents: string;
  boardImg: string;
  createdDate: string;
  totalPages: number;
}

const BoardPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const boardId = parseInt(location.pathname.split("/")[3], 10);
  const creatorId = parseInt(location.pathname.split("/")[2], 10);
  const token = useAuthStore((state) => state.accessToken);
  const [board, setBoard] = useState<Board | null>(null);
  const [isOpen, setOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("게시글");
  const [isEditing, setEditing] = useState<boolean>(false);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [deletedComment, setDeletedComment] = useState<number | null>(null);

  const handleModal = (stateOfModal: boolean, id: number, msg = "게시글") => {
    console.log("handlemodal");
    if (msg === "게시글" && !canEdit) {
      return;
    }
    setOpen(stateOfModal);
    setMessage(msg);
    setSelectedId(id);
  };

  const handleEdit = (editingState: boolean): void => {
    if (!canEdit) {
      return;
    }
    setEditing(editingState);
  };

  const fetchDetail = async () => {
    if (!token || !boardId) {
      return;
    }
    try {
      const response = await client(token).get(`api/board/detail/${boardId}`);
      setBoard(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // console.error("에러코드입니다 :", error.response?.data);
        navigate(
          `/error?code=${error.response?.data.errorCode}&message=${encodeURIComponent(error.response?.data.errorMessage)}`,
        );
      }
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, boardId, creatorId]);

  const fetchUser = async () => {
    if (!token) {
      return;
    }
    try {
      const response = await client(token).get(`api/member`);
      if (response.data.memberId === creatorId) {
        setCanEdit(true);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // console.error("에러코드입니다 :", error.response?.data);
        navigate(
          `/error?code=${error.response?.data.errorCode}&message=${encodeURIComponent(error.response?.data.errorMessage)}`,
        );
      }
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, creatorId]);

  const sendDeleteComment = (id: number) => {
    setDeletedComment(id);
  };

  return (
    <div className="relative w-full flex flex-col items-start bg-gray-100">
      {isOpen && <div className="fixed inset-0 bg-black opacity-50 z-10" />}
      <div
        className={`w-full h-full flex flex-col items-center bg-board-gradient ${isOpen ? "relative z-20" : ""}`}
      >
        {isOpen && (
          <div className="absolute inset-0 bg-black opacity-50 z-10 rounded-3xl" />
        )}
        <div className="w-[70%] mt-10 mb-10 relative">
          <Content
            handleModal={handleModal}
            handleEdit={handleEdit}
            fetchDetail={fetchDetail}
            isCanEdit={canEdit}
            isEditing={isEditing}
            board={board}
          />
          <CommentList
            handleModal={handleModal}
            deletedComment={deletedComment}
          />
        </div>
      </div>
      <DeleteModal
        isOpen={isOpen}
        onClose={() => handleModal(false, selectedId, message)}
        id={selectedId}
        message={message}
        sendDeleteComment={sendDeleteComment}
      />
    </div>
  );
};

export default BoardPage;
