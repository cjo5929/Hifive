import pinkBird from "../assets/icons/loading/pinkBird.png";

const LoadingPage: React.FC = () => {
  const message = "Loading...";
  return (
    <div className="bg-white flex flex-col justify-center items-center">
      <h1 className="text-gray-700">{message}</h1>
      <div className="lds-ring relative">
        <div />
        <div />
        <div />
        <div />
        <img
          src={pinkBird}
          alt="bird"
          className="w-10 h-10 absolute top-1/4 left-1/4 shake-bottom"
        />
      </div>
    </div>
  );
};

export default LoadingPage;
