import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import useAuthStore from "../../store/useAuthStore";
import client from "../../client";

import CommentItem from "./BoardPage.CommentItem";
import CommentForm from "./BoardPage.CommentForm";

interface Comment {
  commentId: number;
  nickname: string;
  createdDate: string;
  contents: string;
  profileImg: string;
}

interface CommentListProps {
  handleModal: (stateOfModal: boolean, commentId: number, msg: string) => void;
  deletedComment: number | null;
}

const CommentList: React.FC<CommentListProps> = ({
  handleModal,
  deletedComment,
}) => {
  const location = useLocation();
  const boardId = parseInt(location.pathname.split("/")[3], 10);
  const token = useAuthStore((state) => state.accessToken);
  const [comments, setComments] = useState<Comment[]>([]);
  const [userNickName, setUserNickName] = useState("");
  const [isEnd, setIsEnd] = useState(false);
  const [top, setTop] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchSignal, setFetchSignal] = useState(false);
  const [userProfileImg, setUserProfileImg] = useState<string>("");

  const handleFetchSignal = () => {
    setFetchSignal(!fetchSignal);
    setIsEnd(false);
  };

  const fetchComments = useCallback(
    async (reset = false) => {
      if (!token || isLoading || isEnd) {
        // console.log(
        //   "Skipping fetch due to token absence, loading state, or end state",
        // );
        return;
      }
      // console.log("Fetching comments...");
      setIsLoading(true);
      try {
        let params = {};
        if (!reset && top !== undefined) {
          params = { top };
        }

        // console.log("Fetching comments with params:", params);

        const response = await client(token).get(`/api/comment/${boardId}`, {
          params,
        });

        // console.log("Fetched comments:", response.data);

        if (response.data.length < 10) {
          setIsEnd(true); // 더 이상 불러올 데이터가 없음을 표시
        }

        setComments((prev) =>
          reset ? response.data : [...prev, ...response.data],
        );

        if (response.data.length > 0) {
          setTop(response.data[response.data.length - 1].commentId);
        }
      } catch (error) {
        // console.error("Error fetching comments:", error);
      } finally {
        setIsLoading(false);
        // console.log("Loading finished.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, boardId, isLoading, isEnd, top, fetchSignal],
  );

  const fetchUser = useCallback(async () => {
    if (!token) return;
    try {
      // console.log("Fetching user info...");
      const response = await client(token).get(`/api/member`);
      // console.log("Fetched user:", response.data);
      setUserNickName(response.data.nickname);
      setUserProfileImg(response.data.profileImg);
    } catch (error) {
      // console.error("Error fetching user:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const initializeComments = async () => {
      // console.log("Initial load...");
      setComments([]);
      setTop(undefined);
      setIsEnd(false);
      await fetchComments(true);
    };
    initializeComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, token]);

  useEffect(() => {
    const handleScroll = () => {
      // console.log("Scroll event detected...");
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.scrollHeight - 100
      ) {
        // console.log("Scroll position is near the bottom, loading more...");
        fetchComments(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [fetchComments]);

  useEffect(() => {
    if (deletedComment !== null) {
      setComments((prevComments) =>
        prevComments.filter((comment) => comment.commentId !== deletedComment),
      );
    }
  }, [deletedComment]);

  return (
    <div className="my-12 px-10">
      <p className="text-h5 my-6">댓글</p>
      <CommentForm
        handleFetchSignal={handleFetchSignal}
        userProfileImg={userProfileImg}
      />
      {comments.map((comment) => (
        <CommentItem
          key={comment.commentId}
          handleModal={handleModal}
          comment={comment}
          userNickName={userNickName}
          fetchComments={fetchComments}
        />
      ))}
      {isLoading && <div>Loading...</div>}
    </div>
  );
};

export default CommentList;
