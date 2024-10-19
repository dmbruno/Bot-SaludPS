import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { getAvailableSlots, assignSlot } from './scripts/sheets';
import { MemoryDB as Database } from '@builderbot/bot';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url'; // Import necesario
import { dirname } from 'path'; // Import necesario

// Simular __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('El directorio actual es:', __dirname);

const infoPath = path.join(__dirname, 'src/info.txt');
console.log('Buscando info.txt en:', infoPath);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

export const adapterProvider = createProvider(Provider);




const monthNames = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const isValidString = (input: string) => input.trim().toLowerCase() !== 'menu';
const isValidNumber = (input: string) => /^[0-9]+$/.test(input);

// **Resetear datos del usuario después de reservar**
const resetUserData = async (state) => {
  await state.update({ nombre: '', telefono: '', obraSocial: '', datosCompletos: false });
};

// **Validar si los datos personales están completos**
const validateUserData = async (state) => {
  const datosCompletos = await state.get('datosCompletos');
  return datosCompletos === true;
};

// **Marcar datos como completos**
const marcarDatosCompletos = async (state) => {
  await state.update({ datosCompletos: true });
};



// **Validación Inicial del Menú**
const initialValidationFlow = addKeyword(['menu'])
  .addAnswer(
    '❌ Debes completar tus datos personales antes de acceder al menú. Redirigiendo...',
    { capture: false },
    async (ctx, { state, gotoFlow, flowDynamic }) => {
      const dataComplete = await validateUserData(state);

      if (!dataComplete) {
        // If data is incomplete, redirect to userDataFlow
        return gotoFlow(userDataFlow);
      }

      if (inMainMenu) {
        // If already in the menu, show the menu without re-validating
        return await flowDynamic('🔸 Selecciona una opción:\n1. Información sobre el lugar 🏥\n2. Reservas 📆');
      }

      // If not in the menu, mark the state and go to the main menu
      inMainMenu = true;
      return gotoFlow(mainMenuFlow);
    }
  );

// **Flujo para capturar Nombre y Apellido**
const userDataFlow = addKeyword(['hola', 'hi', 'hello', 'buenas', 'turno','quiero','solicitar'])
  .addAnswer(
    `👋 ¡Bienvenido/a a *Salud Pulmonar Salta*! 🏥\n\n` +
    `Para reservar un turno con nosotros por favor, escribe tu *Nombre y Apellido*:`,
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      if (!isValidString(ctx.body) || isValidNumber(ctx.body)) {
        await flowDynamic('❌ Datos incorrectos. Por favor, escribe tu nombre y apellido.');
        return gotoFlow(userDataFlow);
      }
      await state.update({ nombre: ctx.body });
      await flowDynamic(`Perfecto, *${ctx.body}*`);
      return gotoFlow(phoneFlow);
    }
  );

// **Flujo para capturar Número de Teléfono**
const phoneFlow = addKeyword(['phone'])
  .addAnswer(
    '📞 Por favor escribe tu *número de teléfono* (prefijo sin 0 y numero de linea sin 15):',
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      if (!isValidNumber(ctx.body)) {
        await flowDynamic('❌ El número debe contener solo dígitos. Inténtalo nuevamente.');
        return gotoFlow(phoneFlow);
      }
      await state.update({ telefono: ctx.body });
      await flowDynamic('📲 ¡Gracias por compartir tu número de teléfono! ☎️' );
      return gotoFlow(obraSocialFlow);
    }
  );

// **Flujo para capturar Obra Social**
const obraSocialFlow = addKeyword(['social'])
  .addAnswer(
    '🔰 Por último *Obra Social/Plan*: ',
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      if (!isValidString(ctx.body)) {
        await flowDynamic('❌ Datos incorrectos. Por favor, escribe tu obra social');
        return gotoFlow(obraSocialFlow);
      }
      await state.update({ obraSocial: ctx.body });
      await marcarDatosCompletos(state); // Marcar datos como completos
      await flowDynamic('✅ Datos personales guardados correctamente ✅');
      return gotoFlow(mainMenuFlow);
    }
  );

  let inMainMenu = false;

// **Menú Principal**
const mainMenuFlow = addKeyword(['volver'])
  .addAnswer(
    '🔸 Por favor selecciona una opción:\n\n1️⃣ Información sobre el lugar 🏥\n2️⃣ Reservas 📆',
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow }) => {
      const opcion = ctx.body.trim();

      if (opcion === '1') {
        try {
          const infoContent = fs.readFileSync(infoPath, 'utf-8');
          await flowDynamic(infoContent);
          inMainMenu = true; // Stay in the main menu state
        } catch (error) {
          console.error('Error al leer el archivo info.txt:', error);
          await flowDynamic('❌ Hubo un problema al mostrar la información.');
        }
      } else if (opcion === '2') {
        inMainMenu = false; // Leaving the main menu
        return gotoFlow(availableMonthsFlow);
      } else {
        await flowDynamic('❌ Opción no válida. Por favor, selecciona una opción válida.');
      }
    }
  );

// **Flujo para Mostrar Meses Disponibles**
const availableMonthsFlow = addKeyword(['turnos'])
  .addAnswer(
    '✅ A continuación se muestran los meses con turnos disponibles desde el actual:',
    { capture: false },
    async (ctx, { flowDynamic }) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const availableSlots = await getAvailableSlots();

      const availableMonths = [
        ...new Set(
          availableSlots
            .filter(slot => {
              // Parseamos la fecha manualmente para evitar problemas de zonas horarias
              const dateParts = slot[1].split('-');
              const slotDate = new Date(
                Number(dateParts[0]),
                Number(dateParts[1]) - 1,
                Number(dateParts[2])
              );
              return slotDate >= today;
            })
            .map(slot => {
              const dateParts = slot[1].split('-');
              const slotDate = new Date(
                Number(dateParts[0]),
                Number(dateParts[1]) - 1,
                Number(dateParts[2])
              );
              return monthNames[slotDate.getMonth()];
            })
        )
      ];

      const monthsMessage = availableMonths
        .map(month => `📆 ${month.charAt(0).toUpperCase() + month.slice(1)}`)
        .join('\n');

      await flowDynamic(monthsMessage);
      await flowDynamic('➡️ Por favor, escribe el nombre del mes que deseas reservar:');
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      const selectedMonth = ctx.body.trim().toLowerCase();
      await state.update({ selectedMonth });

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const availableSlots = await getAvailableSlots();

      const availableDates = [
        ...new Set(
          availableSlots
            .filter(slot => {
              const dateParts = slot[1].split('-');
              const slotDate = new Date(
                Number(dateParts[0]),
                Number(dateParts[1]) - 1,
                Number(dateParts[2])
              );
              const slotMonth = monthNames[slotDate.getMonth()];
              const slotYear = slotDate.getFullYear();

              // Verifica que la fecha corresponda al mes seleccionado y que no haya pasado
              return (
                slotMonth === selectedMonth &&
                slotYear === today.getFullYear() &&
                slotDate >= today
              );
            })
            .map(slot => slot[1])
        )
      ];

      const datesMessage = availableDates.map(date => `📅 ${date}`).join('\n');
      await flowDynamic(`✅ Fechas disponibles en ${selectedMonth}:\n\n${datesMessage}\n\n`);
      await flowDynamic('➡️ Por favor, selecciona la fecha que deseas reservar (formato: YYYY-MM-DD) ó Puedes copiar y pegar la fecha 😉:');
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      const selectedDate = ctx.body.trim();
      await state.update({ selectedDate });

      const availableSlots = await getAvailableSlots();
      const slotsForDate = availableSlots
        .filter(slot => slot[1] === selectedDate && slot[4].toLowerCase() === 'disponible')
        .map(slot => slot[2].trim());

      if (slotsForDate.length === 0) {
        await flowDynamic(`😔 *No hay turnos disponibles para la fecha ${selectedDate}.*`);
        return;
      }

      // Guardamos los turnos disponibles en el estado
      await state.update({ slotsForDate });

      const slotsMessage = slotsForDate.map(time => `🕒 ${time}`).join('\n');
      await flowDynamic(`✅ Turnos disponibles para la fecha ${selectedDate}:\n\n${slotsMessage}\n\n`);
      await flowDynamic('➡️ Por favor, selecciona el turno que deseas reservar, tambien puedes copiar y pegar el horario 😉:');
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      const selectedTime = ctx.body.trim();

      // Recuperar los turnos disponibles para la fecha seleccionada desde el estado
      const slotsForDate = await state.get('slotsForDate') || [];

      // Validar si el turno ingresado está en la lista de turnos disponibles
      if (!slotsForDate.includes(selectedTime)) {
        await flowDynamic(
          `❌ El turno que ingresaste no es válido.\n` +
          `🔄 Volviendo al menú principal. Por favor, intenta nuevamente.`
        );
        // Redirigir al menú principal
        return gotoFlow(mainMenuFlow);
      }

      await state.update({ selectedTime });

      // Recuperar datos del estado
      const nombre = await state.get('nombre');
      const telefono = await state.get('telefono');
      const obraSocial = await state.get('obraSocial');
      const selectedDate = await state.get('selectedDate');

      // Asignar el turno en Google Sheets
      try {
        await assignSlot(selectedDate, selectedTime, `${nombre} - ${obraSocial}`, telefono);

        // Confirmación de la reserva
        await flowDynamic(
          `🛎️ *Turno reservado exitosamente* para *${nombre}*.\n\n` +
          `📅 Fecha: ${selectedDate}\n` +
          `🕒 Horario: ${selectedTime}\n\n` +
          '🤗 ¡Te esperamos con mucho gusto! 🎉' 
        );
        await resetUserData(state);
        await flowDynamic(
          `🔄 Si deseas reservar otro turno, tendrás que ingresar tus datos nuevamente.`
        );
      } catch (error) {
        console.error(error);
        await flowDynamic(
          `❌ Hubo un error al reservar tu turno. Por favor, inténtalo de nuevo más tarde.`
        );
      }
    }
  );

// **Inicialización del Bot**
const main = async () => {
  const adapterFlow = createFlow([
    initialValidationFlow, 
    userDataFlow,
    phoneFlow,
    obraSocialFlow,
    mainMenuFlow,
    availableMonthsFlow,
  ]);

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: new Database(),
  });

  httpServer(+PORT);
  console.log(`Bot iniciado en el puerto: ${PORT}`);
};

main();