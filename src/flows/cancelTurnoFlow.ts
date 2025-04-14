import { addKeyword } from '@builderbot/bot';
import { getTurnoByTelefono, cancelarTurno } from '../scripts/sheets';
import { mainMenuFlow } from '~/app';
import { getClienteByUserId } from '../db'; 

export const cancelTurnoFlow = addKeyword(['cancelar turno'])
  .addAction(async (ctx, { flowDynamic, gotoFlow, state }) => {
    const telefono = ctx.from;

    const turno = await getTurnoByTelefono(telefono);
    const cliente = await getClienteByUserId(telefono); // 🔥 Buscamos también al cliente

    if (!turno || !cliente) {
      await flowDynamic('😕 No encontramos ningún turno reservado con tu número.');
      return gotoFlow(mainMenuFlow);
    }

    await state.update({ turnoParaCancelar: turno });

    await flowDynamic(
      `📅 Tienes un turno reservado para:\n\n` +
      `Fecha: *${turno.fecha}*\n` +
      `Hora: *${turno.horaInicio}*\n` +
      `Obra Social: *${cliente.obraSocial}*\n\n` +
      `❓ ¿Deseas cancelarlo? Responde con *Si* o *No*.`
    );
  })
  .addAnswer('', { capture: true }, async (ctx, { flowDynamic, gotoFlow, state }) => {
    const respuesta = ctx.body.trim().toLowerCase();

    if (respuesta === 'si') {
      const turno = await state.get('turnoParaCancelar');

      try {
        await cancelarTurno(turno.fecha, turno.horaInicio); // ✅ ahora usamos horaInicio correctamente

        await flowDynamic('👋 ¡Tu turno fue cancelado correctamente y quedamos a disposición para una nueva reserva! ✨');
        await flowDynamic('🔙 Regresando al menú principal...');
        return gotoFlow(mainMenuFlow);
      } catch (error) {
        console.error('Error al cancelar turno:', error);
        await flowDynamic('❌ Hubo un error al cancelar tu turno. Por favor intenta más tarde.');
        return gotoFlow(mainMenuFlow);
      }
    } else if (respuesta === 'no') {
      await flowDynamic('👌 No se realizaron cambios. Regresando al menú principal.');
      return gotoFlow(mainMenuFlow);
    } else {
      await flowDynamic('❌ Respuesta inválida. Escribe *Si* para cancelar o *No* para conservar tu turno.');
    }
  });