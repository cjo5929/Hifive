function ContentProfile() {
  return (
    <div>
      <div className="flex items-center space-x-reverse">
        <div className="bg-gray-400 w-[50px] h-[50px] rounded-full" />
        <div className="ml-4">
          <p className="text-h6">개복어</p>
          <p className="text-xs">2024. 07. 15</p>
        </div>
        <div className="ml-auto space-x-2.5">
          <button className="creator-btn-light-md px-[2.5]" type="button">
            수정
          </button>
          <button className="btn-light-md px-[2.5]" type="button">
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContentProfile;
