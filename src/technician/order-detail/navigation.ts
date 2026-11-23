import { useNavigate } from '@tanstack/react-router';

/** Caminhos do detalhe da O.S. para a execução e o complemento de uma tentativa. */
export function useOrderNavigation(orderId: string) {
  const navigate = useNavigate();
  return {
    goExecution: () => navigate({ to: '/technician/orders/$orderId/execution', params: { orderId } }),
    goSupplement: (attemptId: string) =>
      navigate({
        to: '/technician/orders/$orderId/supplement',
        params: { orderId },
        search: { attempt: attemptId },
      }),
  };
}
