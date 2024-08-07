import { useNavigate } from "react-router-dom";

type Fanmeeting = {
  fanmeetingId: number;
  title: string;
  posterImg: string;
  openDate: string;
  startDate: string;
  runningTime: number;
};

interface FanmeetingInfoProps {
  fanmeeting: Fanmeeting;
}

function FanmeetingInfo({ fanmeeting }: FanmeetingInfoProps) {
  const { title, posterImg, startDate } = fanmeeting;

  const [splitDate] = startDate.split("T");
  const date = splitDate.replaceAll("-", ". ");

  const navigate = useNavigate();

  return (
    <div
      className="w-56 mb-5 hover:cursor-pointer"
      onClick={() => navigate(`/ticket/${fanmeeting.fanmeetingId}`)}
      role="presentation"
    >
      <img
        src={posterImg}
        alt="팬미팅포스터"
        className="w-full h-72 bg-gray-300 rounded-xl"
      />
      <div className="flex flex-col items-center mt-2.5">
        <h4 className="w-full text-h5 truncate">{title}</h4>
        <span className="text-h6 text-gray-600">{date}</span>
      </div>
    </div>
  );
}

export default FanmeetingInfo;
