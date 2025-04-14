import { addKeyword } from '@builderbot/bot';
import { getClienteByUserId } from '../db';
import { userDataFlow } from './userDataFlow'; // 👈 este sí puede importar userDataFlow
import { mainMenuFlow } from '../../src/app'; // 👈 este sí puede importar mainMenuFlow


let inMainMenu = false;

export const initialValidationFlow = addKeyword(['menu'])
  .addAnswer(
    '',
    { capture: false },
    async (ctx, { gotoFlow, flowDynamic }) => {
      const userId = ctx.from;
      const cliente = await getClienteByUserId(userId);

      if (!cliente || !cliente.nombre || !cliente.obraSocial || !cliente.telefono) {
        await flowDynamic('❌ Debes completar tus datos personales antes de acceder al menú. Redirigiendo...');
        return gotoFlow(userDataFlow);
      }

      if (inMainMenu) {
        return await flowDynamic('🔸 Selecciona una opción:\n1. Información sobre el lugar 🏥\n2. Reservas 📆');
      }

      inMainMenu = true;
      return gotoFlow(mainMenuFlow);
    }
  );