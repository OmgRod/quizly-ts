import { useNavigate } from 'react-router-dom';

export const useErrorHandler = () => {
  const navigate = useNavigate();

  const handleError = (code: number | string = 500, message: string = '') => {
    navigate(`/error?code=${code}&message=${encodeURIComponent(message)}`);
  };

  return { handleError };
};
