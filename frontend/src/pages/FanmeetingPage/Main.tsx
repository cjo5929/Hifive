import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  OpenVidu,
  Publisher,
  Session,
  Subscriber,
  Stream,
} from "openvidu-browser";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import VideoContainer from "./VideoContainer";
import JoinForm from "./JoinForm";
import useAuthStore from "../../store/useAuthStore";
import client from "../../client";
import WaitingPage from "./WaitingPage";

import roomframe from "../../assets/Fanmeeting/roomframe.png";
import drop from "../../assets/Fanmeeting/drop.png";

const APPLICATION_SERVER_URL =
  process.env.NODE_ENV === "production" ? "" : "https://i11a107.p.ssafy.io/";
// const APPLICATION_SERVER_URL =
//   process.env.NODE_ENV === "production" ? "" : "http://localhost:8080/";

interface Timetable {
  categoryName: string;
  sequence: number;
  detail: string;
}

interface ResponseData {
  sessionId: string;
  timetables: Timetable[];
}

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  isCreator: boolean;
}

interface Quiz {
  problem: string;
  answer: boolean;
  totalQuizCount: number;
  detail: string;
}

interface Rank {
  fanId: number;
  score: number;
}

export default function Main() {
  const navigate = useNavigate();
  const [myUserName, setMyUserName] = useState<string>("");
  const token = useAuthStore((state) => state.accessToken);
  const [session, setSession] = useState<Session | undefined>(undefined);
  // const [mainStreamManager, setMainStreamManager] = useState<
  //   Publisher | Subscriber | undefined
  // >(undefined);
  const [publisher, setPublisher] = useState<Publisher | undefined>(undefined);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  // const [currentVideoDevice, setCurrentVideoDevice] =
  //   useState<MediaDeviceInfo | null>(null);
  const location = useLocation();
  const mySessionId = location.pathname.split("/")[2];
  const [isCreator, setIsCreator] = useState<boolean | undefined>();
  const [waitingUrl, setWaitingUrl] = useState<string | null>(null);
  const [fanAudioStatus, setFanAudioStatus] = useState<{
    [key: string]: boolean;
  }>({});
  const [focusedSubscriber, setFocusedSubscriber] = useState<string | null>(
    null,
  );
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [fanmeetingName, setFanmeetingName] = useState<string | null>(null);

  // 퀴즈 관련 상태
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isReveal, setIsReveal] = useState(false);
  const handleReveal = (bool: boolean) => {
    setIsReveal(bool);
  };
  const [ranks, setRanks] = useState<Rank[] | null>(null);
  const handleRank = (allRank: Rank[]) => {
    setRanks(allRank);
  };

  // 타임 테이블 관련 상태
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [currentSequence, setCurrentSequence] = useState(0);

  // 채팅 관련 상태 추가
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const userColorsRef = useRef<{ [key: string]: string }>({});
  const [userId, setUserId] = useState<number | undefined>();
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);

  // 헤더 최소화 상태 관리
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);

  // 유저 정보 불러오기
  const fetchUser = async () => {
    if (!token) {
      return;
    }
    try {
      const response = await client(token).get(`api/member`);
      setUserId(response.data.memberId);
      setMyUserName(response.data.nickname);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchFanmeeting = async () => {
    if (!token || !mySessionId) {
      return;
    }
    try {
      const response = await client(token).get(`api/fanmeeting/${mySessionId}`);
      if (response.data.creatorId === userId) {
        setIsCreator(true);
      }
      setWaitingUrl(response.data.link);
      setFanmeetingName(response.data.title);
      setCreatorName(response.data.creatorName);
    } catch (error) {
      console.error(error);
    }
  };

  const validateUser = async () => {
    if (!token || !mySessionId || !userId) {
      return;
    }
    try {
      await client(token).post(`api/sessions/check`, {
        memberId: userId,
        fanmeetingId: parseInt(mySessionId, 10),
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.data.errorCode === "FANMEETING-005") {
          navigate(`/meet-up/${mySessionId}/result`);
        } else {
          navigate(
            `/error?code=${error.response?.data.errorCode}&message=${encodeURIComponent(error.response?.data.errorMessage)}`,
          );
        }
      }
    }
  };

  useEffect(() => {
    validateUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mySessionId, userId]);

  useEffect(() => {
    fetchFanmeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, mySessionId, userId]);

  const OV = useRef<OpenVidu>(new OpenVidu());

  const deleteSubscriber = useCallback((streamManager: Subscriber) => {
    setSubscribers((prevSubscribers) => {
      const index = prevSubscribers.indexOf(streamManager);
      if (index > -1) {
        const newSubscribers = [...prevSubscribers];
        newSubscribers.splice(index, 1);
        return newSubscribers;
      }
      return prevSubscribers;
    });
  }, []);

  const createSession = async (sessionId: string): Promise<string> => {
    console.log(APPLICATION_SERVER_URL);
    const response = await axios.post<ResponseData>(
      `${APPLICATION_SERVER_URL}api/sessions/open`,
      { customSessionId: sessionId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    setTimetables(response.data.timetables);
    return response.data.sessionId;
  };

  const createToken = async (sessionId: string): Promise<string> => {
    try {
      const response = await axios.post<string>(
        `${APPLICATION_SERVER_URL}api/sessions/${sessionId}/connections`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        navigate(
          `/error?code=${error.response?.data.errorCode}&message=${encodeURIComponent(error.response?.data.errorMessage)}`,
        );
      }
      return "";
    }
  };

  const getToken = useCallback(async () => {
    if (!token || !mySessionId) {
      return "";
    }
    return createSession(mySessionId).then((sessionId) =>
      createToken(sessionId),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySessionId, token]);

  const joinSession = useCallback(() => {
    const mySession = OV.current.initSession();

    mySession.on("streamCreated", (event: { stream: Stream }) => {
      const subscriber = mySession.subscribe(event.stream, undefined);
      setSubscribers((prevSubscribers) => [...prevSubscribers, subscriber]);
      if (!isCreator) {
        setFanAudioStatus((prevStatus) => ({
          ...prevStatus,
          [subscriber.stream.connection.connectionId]:
            subscriber.stream.audioActive,
        }));
      }
    });

    mySession.on("streamDestroyed", (event: { stream: Stream }) => {
      deleteSubscriber(event.stream.streamManager as Subscriber);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mySession.on("exception", (exception: any) => {
      console.warn(exception);
    });

    mySession.on("signal:audioStatus", (event) => {
      if (event.data) {
        const data = JSON.parse(event.data);
        setFanAudioStatus((prevStatus) => ({
          ...prevStatus,
          [data.connectionId]: data.audioActive,
        }));
      }
    });

    mySession.on("signal:focus", (event) => {
      if (event.data) {
        const data = JSON.parse(event.data);
        const focusedSubscriberId = data.focusedSubscriber;

        if (focusedSubscriberId) {
          const foundSubscriber = subscribers.find(
            (sub) => sub.stream.connection.connectionId === focusedSubscriberId,
          );

          if (foundSubscriber) {
            setFocusedSubscriber(focusedSubscriberId);
          } else if (
            publisher &&
            publisher.stream.connection.connectionId === focusedSubscriberId
          ) {
            setFocusedSubscriber(focusedSubscriberId);
          } else {
            setFocusedSubscriber(null);
          }
        } else {
          setFocusedSubscriber(null);
        }
      }
    });

    mySession.on("signal:userAnswer", (event) => {
      if (event.data) {
        const data = JSON.parse(event.data);
        setUserAnswers((prevAnswers) => ({
          ...prevAnswers,
          [data.userId]: data.answer,
        }));
      }
    });

    mySession.on("signal:resetAnswer", (event) => {
      if (event.data) {
        setUserAnswers({});
      }
    });

    // 밝은 색상을 제외하고 색상 생성 함수
    const generateColor = (): string => {
      const letters = "0123456789ABCDEF";
      let color = "#";
      for (let i = 0; i < 6; i += 1) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      // 밝은 색상 제외
      if (
        parseInt(color.substring(1, 3), 16) > 150 &&
        parseInt(color.substring(3, 5), 16) > 150 &&
        parseInt(color.substring(5, 7), 16) > 150
      ) {
        return generateColor();
      }
      return color;
    };

    // 채팅 관련 시그널 처리
    mySession.on("signal:chat", (event) => {
      if (event.data) {
        const data = JSON.parse(event.data);
        setChatMessages((prevMessages) => [...prevMessages, data]);

        if (!userColorsRef.current[data.user]) {
          userColorsRef.current[data.user] = generateColor();
        }
      }
    });

    setSession(mySession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySessionId, isCreator, deleteSubscriber]);

  useEffect(() => {
    if (session && token) {
      getToken().then(async (openviduToken) => {
        try {
          await session.connect(openviduToken, {
            // 크리에이터일경우 이름 특수문자(##)로 설정 => 팬이랑 안겹치게 하기 위해서
            clientData: isCreator ? "##" : myUserName,
            userId,
          });

          const newPublisher = await OV.current.initPublisherAsync(undefined, {
            audioSource: undefined,
            videoSource: undefined,
            publishAudio: false,
            publishVideo: true,
            resolution: "640x480",
            frameRate: 30,
            insertMode: "APPEND",
            mirror: false,
          });

          session.publish(newPublisher);

          // const devices = await OV.current.getDevices();
          // const videoDevices = devices.filter(
          //   (device) => device.kind === "videoinput",
          // );

          // const currentVideoDeviceId = newPublisher.stream
          //   .getMediaStream()
          //   .getVideoTracks()[0]
          //   .getSettings().deviceId;

          // const currentVideoInputDevice = videoDevices.find(
          //   (device) => device.deviceId === currentVideoDeviceId,
          // ) as MediaDeviceInfo;

          // setMainStreamManager(newPublisher);
          setPublisher(newPublisher);
          // setCurrentVideoDevice(currentVideoInputDevice || null);

          setFanAudioStatus((prevStatus) => ({
            ...prevStatus,
            [session.connection.connectionId]: newPublisher.stream.audioActive,
          }));
        } catch (error) {
          if (axios.isAxiosError(error)) {
            console.log(
              "There was an error connecting to the session:",
              error.code,
              error.message,
            );
          } else {
            console.error("An unexpected error occurred:", error);
          }
        }
      });
    }
  }, [session, isCreator, myUserName, token, getToken, userId]);

  const leaveSession = useCallback(() => {
    if (session) {
      session.disconnect();
    }

    OV.current = new OpenVidu();
    setSession(undefined);
    setSubscribers([]);
    // setMainStreamManager(undefined);
    setPublisher(undefined);
  }, [session]);

  const closeSessionApi = async () => {
    if (!token || !session || !mySessionId) {
      return;
    }
    try {
      const response = await client(token).delete(
        `api/sessions/${mySessionId}`,
      );
      console.log(response.data);
    } catch (error) {
      console.error("Error closing the session:", error);
    }
  };

  const closeSession = useCallback(async () => {
    try {
      await closeSessionApi();
      if (session) {
        await session.signal({
          type: "closeSession",
          data: JSON.stringify({
            reason: "The session has been closed by the creator.",
          }),
        });
        leaveSession();
        console.log("나갔어");
      }
    } catch (error) {
      console.error("Error:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, token, mySessionId]);

  // const switchCamera = useCallback(async () => {
  //   try {
  //     const devices = await OV.current.getDevices();
  //     const videoDevices = devices.filter(
  //       (device) => device.kind === "videoinput",
  //     );

  //     if (videoDevices.length > 1) {
  //       const newVideoInputDevice = videoDevices.find(
  //         (device) => device.deviceId !== currentVideoDevice?.deviceId,
  //       ) as MediaDeviceInfo;

  //       if (newVideoInputDevice) {
  //         const newPublisher = OV.current.initPublisher(undefined, {
  //           videoSource: newVideoInputDevice.deviceId,
  //           publishAudio: false,
  //           publishVideo: true,
  //           mirror: true,
  //         });

  //         if (session) {
  //           await session.unpublish(mainStreamManager as Publisher);
  //           await session.publish(newPublisher);
  //           setCurrentVideoDevice(newVideoInputDevice);
  //           setMainStreamManager(newPublisher);
  //           setPublisher(newPublisher);
  //         }
  //       }
  //     }
  //   } catch (e) {
  //     console.error(e);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [currentVideoDevice, session, mainStreamManager, isCreator]);

  const toggleMyAudio = useCallback(() => {
    if (publisher) {
      const newAudioStatus = !publisher.stream.audioActive;
      publisher.publishAudio(newAudioStatus);
      setFanAudioStatus((prevStatus) => ({
        ...prevStatus,
        [session?.connection.connectionId || ""]: newAudioStatus,
      }));
      session?.signal({
        data: JSON.stringify({
          connectionId: session.connection.connectionId,
          audioActive: newAudioStatus,
        }),
        type: "audioStatus",
      });
    }
  }, [publisher, session]);

  // 내 오디오 끄기 함수
  const muteMyAudio = useCallback(() => {
    if (publisher && publisher.stream.audioActive) {
      console.log(publisher?.stream.audioActive);
      publisher.publishAudio(false);
      setFanAudioStatus((prevStatus) => ({
        ...prevStatus,
        [session?.connection.connectionId || ""]: false,
      }));
      session?.signal({
        data: JSON.stringify({
          connectionId: session.connection.connectionId,
          audioActive: false,
        }),
        type: "audioStatus",
      });
    }
  }, [publisher, session]);

  const toggleMyVideo = useCallback(() => {
    if (publisher) {
      publisher.publishVideo(!publisher.stream.videoActive);
    }
  }, [publisher]);

  // 크리에이터가 특정 subscriber의 마이크 상태를 토글하는 함수
  const toggleFanAudio = useCallback(
    (subscriber: Subscriber) => {
      const newAudioStatus = !subscriber.stream.audioActive;
      console.log(newAudioStatus);

      // 해당 subscriber에게 마이크 상태 변경 신호를 보냄
      session?.signal({
        to: [subscriber.stream.connection], // 특정 subscriber에게 신호를 보냄
        data: JSON.stringify({
          audioActive: newAudioStatus,
        }),
        type: "fanAudioStatus", // 신호 타입
      });

      setFanAudioStatus((prevStatus) => ({
        ...prevStatus,
        [subscriber.stream.connection.connectionId]: newAudioStatus,
      }));
    },
    [session],
  );

  // subscriber가 신호를 받아 자신의 마이크 상태를 변경하는 로직
  useEffect(() => {
    if (!session || !publisher) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAudioStatusSignal = (event: any) => {
      const { audioActive } = JSON.parse(event.data);
      console.log(publisher.stream);
      publisher.publishAudio(audioActive);
      const { connectionId } = event.from;

      setFanAudioStatus((prevStatus) => ({
        ...prevStatus,
        [connectionId]: audioActive,
      }));
    };
    // 신호 수신 이벤트 리스너 등록
    session.on("signal:fanAudioStatus", handleAudioStatusSignal);

    // 컴포넌트 언마운트 시 이벤트 리스너 해제
    // eslint-disable-next-line consistent-return
    return () => {
      session.off("signal:fanAudioStatus", handleAudioStatusSignal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, publisher]);

  const focusOnSubscriber = useCallback(
    (subscriber: Subscriber | Publisher) => {
      const subscriberId = subscriber.stream.connection.connectionId;
      const newFocusedSubscriber =
        focusedSubscriber === subscriberId ? null : subscriberId;

      session?.signal({
        data: JSON.stringify({
          focusedSubscriber: newFocusedSubscriber,
        }),
        type: "focus",
      });
    },
    [focusedSubscriber, session],
  );

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleFocusSignal = (event: any) => {
        const data = JSON.parse(event.data);
        const focusedSubscriberId = data.focusedSubscriber;

        if (focusedSubscriberId) {
          const foundSubscriber = subscribers.find(
            (sub) => sub.stream.connection.connectionId === focusedSubscriberId,
          );

          if (foundSubscriber) {
            setFocusedSubscriber(focusedSubscriberId);
          } else if (
            publisher &&
            publisher.stream.connection.connectionId === focusedSubscriberId
          ) {
            setFocusedSubscriber(focusedSubscriberId);
          } else {
            setFocusedSubscriber(null);
          }
        } else {
          setFocusedSubscriber(null);
        }
      };

      session.on("signal:focus", handleFocusSignal);

      return () => {
        session.off("signal:focus", handleFocusSignal);
      };
    }
  }, [session, subscribers, publisher]);

  const handleChangeMessage = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
    },
    [],
  );

  const handleSendMessage = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const now = Date.now();
      // 0.5초에 채팅 하나 보낼 수 있다.
      if (lastMessageTime && now - lastMessageTime < 500) {
        alert("도배 금지!!");
        return;
      }
      if (newMessage.trim() !== "") {
        const message = {
          id: uuidv4(),
          user: myUserName,
          text: newMessage,
          isCreator,
        };
        session?.signal({
          data: JSON.stringify(message),
          type: "chat",
        });
        setNewMessage("");
        setLastMessageTime(now);
      }
    },
    [newMessage, myUserName, session, lastMessageTime, isCreator],
  );

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleSignal = (event: any) => {
        if (event.data) {
          console.log("Received closeSession signal:", event.data);
          leaveSession();
          navigate("result");
        }
      };
      session.on("signal:closeSession", handleSignal);
      return () => {
        session.off("signal:closeSession", handleSignal);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const goToNextCorner = useCallback(
    (newSequence: number) => {
      if (isCreator && session) {
        setCurrentSequence(newSequence);
        session.signal({
          type: "nextCorner",
          data: JSON.stringify({ sequence: newSequence }),
        });
      }
    },
    [isCreator, session],
  );

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    if (session) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleNextCornerSignal = (event: any) => {
        if (event.data) {
          const data = JSON.parse(event.data);
          setCurrentSequence(data.sequence);
        }
      };

      session.on("signal:nextCorner", handleNextCornerSignal);

      // 클린업 함수 반환
      return () => {
        session.off("signal:nextCorner", handleNextCornerSignal);
      };
    }
  }, [session]);

  const handleFetchQuiz = (quiz: Quiz | null) => {
    setCurrentQuiz(quiz);
  };

  // 헤더 클릭 시 확장 상태 변경
  const toggleHeader = () => {
    setIsHeaderExpanded((prev) => !prev);
  };

  return (
    <div className="w-full h-[100vh] items-center bg-meetingroom-700">
      {/* eslint-disable-next-line no-nested-ternary */}
      {session === undefined ? (
        <JoinForm
          myUserName={myUserName}
          mySessionId={mySessionId}
          isCreator={isCreator}
          joinSession={joinSession}
          setIsCreator={setIsCreator}
          creatorName={creatorName}
          fanmeetingName={fanmeetingName}
        />
      ) : currentSequence === 0 ? (
        <div>
          <WaitingPage
            token={token}
            mySessionId={mySessionId}
            timetables={timetables}
            currentSequence={currentSequence}
            isCreator={isCreator}
            setCurrentSequence={setCurrentSequence}
            onSequenceChange={goToNextCorner}
            waitingUrl={waitingUrl}
          />
        </div>
      ) : (
        <div
          id="session"
          className="bg-meetingroom-700 w-full h-full flex flex-col items-center"
        >
          <img
            src={roomframe}
            alt="frame"
            className="w-11/12 min-w-[1400px] absolute top-7"
          />
          <div
            id="session-header"
            className="w-[200px] absolute top-0 flex flex-col justify-start items-center"
          >
            <button
              type="button"
              className="bg-meetingroom-100 text-white cursor-pointer w-[100px] h-[20px] rounded-b-2xl bg-opacity-80 flex justify-center items-center"
              onClick={toggleHeader}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  toggleHeader();
                }
              }}
              aria-expanded={isHeaderExpanded}
            >
              {/* <h1 id="session-title" className="text-center">
                {mySessionId}
              </h1> */}
              <img src={drop} alt="drop" className="w-8 h-3" />
            </button>
            <div
              className={`transition-max-height duration-200 overflow-hidden ${
                isHeaderExpanded
                  ? "max-h-[500px] w-[200px] bg-white bg-opacity-80 flex flex-col justify-center items-center rounded-xl p-2 gap-2 z-30 shadow-lg backdrop-blur-sm"
                  : "max-h-0 flex flex-col justify-center items-center"
              }`}
            >
              <input
                className="btn btn-large meetingroom-btn-md"
                type="button"
                id="buttonLeaveSession"
                onClick={leaveSession}
                value="입장 화면으로"
              />
              {isCreator ? (
                <input
                  className="meetingroom-btn-light-md"
                  type="button"
                  id="buttonToggleAudio"
                  onClick={toggleMyAudio}
                  value="마이크 On / Off"
                />
              ) : (
                <input
                  className={
                    publisher && publisher.stream.audioActive
                      ? "btn-md hover:pointer"
                      : "btn-md bg-gray-700 hover:default"
                  }
                  type="button"
                  id="buttonToggleAudio"
                  onClick={muteMyAudio}
                  value={
                    publisher && publisher.stream.audioActive
                      ? "음소거 하기"
                      : "음소거 중"
                  }
                />
              )}
              <input
                className="meetingroom-btn-light-md"
                type="button"
                id="buttonToggleVideo"
                onClick={toggleMyVideo}
                value="카메라 On / Off"
              />
              {isCreator && (
                <>
                  {/* <input
                    className="btn btn-large btn-success"
                    type="button"
                    id="buttonSwitchCamera"
                    onClick={switchCamera}
                    value="카메라 기종 변경"
                  /> */}
                  <button
                    type="button"
                    className="btn-md"
                    onClick={closeSession}
                  >
                    세션 종료
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-[108px] z-10">
            <VideoContainer
              session={session}
              publisher={publisher}
              subscribers={subscribers}
              isCreator={isCreator}
              toggleFanAudio={toggleFanAudio}
              fanAudioStatus={fanAudioStatus}
              focusedSubscriber={focusedSubscriber}
              focusOnSubscriber={focusOnSubscriber}
              userAnswers={userAnswers}
              currentSequence={currentSequence}
              timetables={timetables}
              currentQuiz={currentQuiz}
              isReveal={isReveal}
              ranks={ranks}
              token={token}
              mySessionId={mySessionId}
              setCurrentSequence={setCurrentSequence}
              onSequenceChange={goToNextCorner}
              handleFetchQuiz={handleFetchQuiz}
              handleReveal={handleReveal}
              handleRank={handleRank}
              chatMessages={chatMessages}
              newMessage={newMessage}
              handleChangeMessage={handleChangeMessage}
              handleSendMessage={handleSendMessage}
              userColors={userColorsRef.current}
            />
          </div>
        </div>
      )}
    </div>
  );
}
