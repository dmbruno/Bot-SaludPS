import { addKeyword } from '@builderbot/bot';
import { adminFlow } from './adminFlow'; // 👈 el menú que ya tenés

const ADMIN_PHONES = ['5493875051112', '5493875124186']; // 🔥 Lista de números admin

export const adminValidationFlow = addKeyword(['admin'])
  .addAction(async (ctx, { gotoFlow, flowDynamic }) => {
    const userId = ctx.from;

    console.log('🛡️ Intento de acceso admin por:', userId);

    if (ADMIN_PHONES.includes(userId)) { // ✅ Verifica si el número está en la lista
      await flowDynamic('✅ Acceso de administrador confirmado. Cargando menú...');
      return gotoFlow(adminFlow);
    } else {
      await flowDynamic('❌ No tienes permisos para acceder al menú de administración.');
      return;
    }
  });