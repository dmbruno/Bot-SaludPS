import { addKeyword } from '@builderbot/bot';
import { getClienteByUserId, saveCliente } from '../db';
import { mainMenuFlow } from '~/app'; // Asegurate que esté bien importado

const isValidString = (input: string) => input.trim().length > 1;

export const userDataFlow = addKeyword(['hola', 'hi', 'hello', 'buenas', 'turno', 'quiero', 'solicitar'])
  .addAnswer('👋 ¡Bienvenido/a a *Salud Pulmonar Salta*! 🏥', { capture: false })
  .addAction(async (ctx, { flowDynamic, state, gotoFlow }) => {
    const userId = ctx.from;
    console.log('➡️ [userDataFlow] Usuario ID:', userId);

    const cliente = await getClienteByUserId(userId);
    console.log('📂 [userDataFlow] Cliente encontrado en DB:', cliente);

    if (cliente && cliente.nombre && cliente.obraSocial && cliente.telefono) {
      const nombreCorto = cliente.nombre.split(' ')[0];
      await flowDynamic(`👋 ¡Hola de nuevo, *${nombreCorto}*! ¿En qué podemos ayudarte hoy?`);
      console.log('✅ [userDataFlow] Cliente ya registrado, acceso directo al menú.');

      return gotoFlow(mainMenuFlow); // 🚀 DIRECTAMENTE al menú
    }

    await flowDynamic('✏️ Para reservar un turno, por favor escribí tu *Nombre y Apellido* (ej: Juan Perez):');
  })
  .addAnswer('', { capture: true }, async (ctx, { state, flowDynamic }) => {
    const nombre = ctx.body.trim();
    console.log('📝 [userDataFlow] Nombre ingresado:', nombre);

    if (!isValidString(nombre)) {
      await flowDynamic('❌ Por favor ingresa un nombre válido.');
      return;
    }

    await state.update({ nombreCompleto: nombre });
    await flowDynamic('🏥 Ahora escribí tu *Obra Social* (ej: SANCOR):');
  })
  .addAnswer('', { capture: true }, async (ctx, { state, flowDynamic, gotoFlow }) => {
    const obraSocial = ctx.body.trim();
    console.log('🏥 [userDataFlow] Obra Social ingresada:', obraSocial);

    if (!isValidString(obraSocial)) {
      await flowDynamic('❌ Por favor ingresa una obra social válida.');
      return;
    }

    const nombreCompleto = await state.get('nombreCompleto');
    const telefono = ctx.from;
    const userId = ctx.from;

    console.log('💾 [userDataFlow] Guardando en DB:', { userId, nombreCompleto, telefono, obraSocial });

    await saveCliente(userId, nombreCompleto, telefono, obraSocial);
    console.log('✅ [userDataFlow] Datos guardados exitosamente.');

    const nombreCorto = nombreCompleto.split(' ')[0];
    await flowDynamic(`✅ ¡Gracias *${nombreCorto}*! La carga de tus datos fue exitosa. A continuación te mostramos las opciones disponibles. 🙂`);

    await state.clear();
    console.log('🧹 [userDataFlow] State limpiado.');

    // 🚀 Una vez registrado, también lo mando al menú
    return gotoFlow(mainMenuFlow);
  });