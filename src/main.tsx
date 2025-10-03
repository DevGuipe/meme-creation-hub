import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logger } from '@/lib/logger';

const rootElement = document.getElementById("root");

if (!rootElement) {
  logger.error('Elemento #root não encontrado no DOM');
} else {
  try {
    createRoot(rootElement).render(<App />);
    logger.info('Aplicação renderizada com sucesso');
  } catch (error) {
    logger.error('Erro ao renderizar App', error);
  }
}
