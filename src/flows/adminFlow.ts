import { addKeyword } from '@builderbot/bot';
import { getAllClientes } from '../db';
import { mainMenuFlow } from '~/app';

export const adminFlow = addKeyword(['__adminTrigger__']) // este trigger no lo vamos a usar realmente
  .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
    
    await flowDynamic('🔄 Un momento... estamos cargando el menú 🛠️...');
    await flowDynamic(
      `*🛠️ Menú de Administración*\n\n` +
      `1️⃣ Ver lista de clientes\n\n` +
      `📝 Responde con *1* para ver los clientes.\n` +
      `🔙 O escribe *volver* para regresar al menú principal.`
    );
  })
  .addAnswer('', { capture: true }, async (ctx, { flowDynamic, gotoFlow }) => {
    const opcion = ctx.body.trim();

    if (opcion === '1') {
      const clientes = await getAllClientes();

      if (clientes.length === 0) {
        await flowDynamic('😕 No hay clientes registrados aún.');
      } else {
        let mensaje = '*📋 Listado de Clientes:*\n\n';
        clientes.forEach((cliente, index) => {
          mensaje += `🎖️ Cliente ${index + 1}:\n` +
                     `• Nombre: ${cliente.nombre}\n` +
                     `• Teléfono: ${cliente.telefono}\n` +
                     `• Obra Social: ${cliente.obraSocial}\n\n`;
        });
        await flowDynamic(mensaje);
      }
      await flowDynamic('🔙 Escribe *volver* para regresar al menú principal.');
    } else if (opcion.toLowerCase() === 'volver') {
      await flowDynamic('🔄 Regresando al menú principal...');
      return gotoFlow(mainMenuFlow);
    } else {
      await flowDynamic('❌ Opción inválida. Escribe *1* para ver clientes o *volver* para salir.');
    }
  });