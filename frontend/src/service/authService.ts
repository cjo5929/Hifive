import axios from "axios";

export const kakaoLogin = () => {
  const REDIRECT_URI = `${process.env.REACT_APP_AUTH_END_POINT}/oauth2/authorization/kakao`;
  window.location.href = REDIRECT_URI;
};

export const getAccessToken = async () => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_END_POINT}/api/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return response.data.accessToken;
  } catch (error) {
    return null;
  }
};
