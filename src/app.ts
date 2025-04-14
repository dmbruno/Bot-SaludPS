import { createBot, createProvider, createFlow, addKeyword } from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys';
import { getAvailableSlots, assignSlot } from './scripts/sheets';
import { MemoryDB as Database } from '@builderbot/bot';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url'; // Import necesario
import { dirname } from 'path'; // Import necesario
import { userDataFlow } from './flows/userDataFlow';
import { getClienteByUserId } from './db';
import { initialValidationFlow } from './flows/initialValidationFlow'; // 👈 este sí puede importar initialValidationFlow
import { adminFlow } from './flows/adminFlow';
import { adminValidationFlow } from './flows/adminValidationFlow';
import { cancelTurnoFlow } from './flows/cancelTurnoFlow';




// Simular __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);



const infoPath = path.join(__dirname, 'info.txt');


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







let inMainMenu = false;

// **Menú Principal**
export const mainMenuFlow = addKeyword(['volver'])
  .addAnswer(
    '🔸 Por favor selecciona una opción:\n\n' +
    '1️⃣ Información 🏥\n' +
    '2️⃣ Reserva De Turnos 📆\n' +
    '3️⃣ Cancelación De Turnos ❌\n\n' +
    '📝 O escribe *salir* para finalizar la conversación.',
    { capture: true },
    async (ctx, { flowDynamic, gotoFlow, endFlow }) => {
      const opcion = ctx.body.trim();
      const telefonoAdmin = '5493875051112'; // 👈 Tu número de admin

      if (opcion === '1') {
        try {
          const infoContent = fs.readFileSync(infoPath, 'utf-8');
          await flowDynamic(infoContent);
          inMainMenu = true; // Stay in the main menu state
        } catch (error) {
          console.error('Error al leer el archivo info.txt:', error);
          await flowDynamic('❌ Hubo un problema al mostrar la información.');
        }
        return;
      }

      if (opcion === '2') {
        inMainMenu = false; // Leaving the main menu
        return gotoFlow(availableMonthsFlow);
      }

      if (opcion === '3') {
        inMainMenu = false; // Leaving the main menu
        return gotoFlow(cancelTurnoFlow); // 🚀 Vamos al nuevo flujo de cancelación de turnos
      }

      if (opcion.toLowerCase() === 'salir') {
        await flowDynamic('👋 ¡Gracias por comunicarte! ¡Te deseamos un excelente día! ✨');
        return endFlow(); // 👈 Finalizamos la conversación
      }

      // 🚨 Antes de tirar error, validamos si es admin
      if (opcion.toLowerCase() === 'admin') {
        if (ctx.from === telefonoAdmin) {
          await flowDynamic('✅ Acceso de administrador confirmado. Cargando menú...');
          return gotoFlow(adminFlow);
        } else {
          await flowDynamic('❌ No tienes permisos de administrador.');
          return;
        }
      }

      // Si no es admin, salir ni una opción válida:
      await flowDynamic('❌ Opción no válida. Por favor, selecciona una opción válida.');
    }
  );

// **Flujo para Mostrar Meses Disponibles**
const availableMonthsFlow = addKeyword(['turnos'])
  .addAnswer(
    '✅ A continuación se muestran los meses con turnos disponibles desde el actual:',
    { capture: false },
    async (ctx, { state, flowDynamic }) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const availableSlots = await getAvailableSlots();

      const availableMonths = [
        ...new Set(
          availableSlots
            .filter(slot => {
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
              return slotDate.getMonth() + 1;
            })
        )
      ];

      // Usamos un contador para numerar dinámicamente las opciones
      const numberEmojis = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '1️⃣1️⃣', '1️⃣2️⃣'];

      // Creamos el mensaje con los emojis de número y los nombres de los meses
      const monthsMessage = availableMonths
        .map((monthNumber, index) => `${numberEmojis[index + 1]} ${monthNames[monthNumber - 1].charAt(0).toUpperCase() + monthNames[monthNumber - 1].slice(1)}`)
        .join('\n');

      await state.update({ availableMonths });
      await flowDynamic(monthsMessage);
      await flowDynamic('➡️ Por favor, selecciona el *NUMERO* del mes que deseas reservar:');
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      const userInput = ctx.body.trim();
      const selectedOption = parseInt(userInput, 10);

      const availableMonths = await state.get('availableMonths') || [];

      // Verificamos si el número ingresado está dentro del rango de opciones
      if (selectedOption < 1 || selectedOption > availableMonths.length) {
        await flowDynamic('❌ Opción no válida. Por favor, selecciona un número de la lista.');
        return gotoFlow(availableMonthsFlow);
      }

      // Convertimos la opción seleccionada a un índice de mes disponible
      const selectedMonthNumber = availableMonths[selectedOption - 1];
      const selectedMonth = monthNames[selectedMonthNumber - 1];
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
              return (
                slotDate.getMonth() + 1 === selectedMonthNumber &&
                slotDate >= today
              );
            })
            .map(slot => slot[1])
        )
      ];

      if (availableDates.length === 0) {
        await flowDynamic(`😔 No hay fechas disponibles para *${selectedMonth}*.`);
        return gotoFlow(mainMenuFlow);
      }

      const datesMessage = availableDates.map(date => `📅 ${date}`).join('\n');
      await flowDynamic(`✅ Fechas disponibles en *${selectedMonth}*:\n\n${datesMessage}\n\n`);
      await flowDynamic(
        '➡️ Por favor, selecciona la fecha que deseas reservar (formato: YYYY-MM-DD) o puedes copiar y pegar la fecha 😉:'
      );
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      const selectedDate = ctx.body.trim();
      await state.update({ selectedDate });

      const availableSlots = await getAvailableSlots();

      const slotsForDate = availableSlots
        .filter(slot => {
          const slotDate = slot[1];
          return slotDate === selectedDate && slot[4].toLowerCase() === 'disponible';
        })
        .map(slot => slot[2].trim());

      if (slotsForDate.length === 0) {
        await flowDynamic(`😔 *No hay turnos disponibles para la fecha ${selectedDate}.*`);
        return gotoFlow(mainMenuFlow);
      }

      await state.update({ slotsForDate });

      const slotsMessage = slotsForDate.map(time => `🕒 ${time}`).join('\n');
      await flowDynamic(
        `✅ Turnos disponibles para la fecha ${selectedDate}:\n\n${slotsMessage}\n\n`
      );
      await flowDynamic(
        '➡️ Por favor, selecciona el turno que deseas reservar, también puedes copiar y pegar el horario 😉:'
      );
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      const selectedTime = ctx.body.trim();
      const slotsForDate = (await state.get('slotsForDate')) || [];
  
      if (!slotsForDate.includes(selectedTime)) {
        await flowDynamic(
          `❌ El turno que ingresaste no es válido.\n` +
          `🔄 Volviendo al menú principal. Por favor, intenta nuevamente.`
        );
        return gotoFlow(mainMenuFlow);
      }
  
      await state.update({ selectedTime });
  
      const userId = ctx.from;
      const cliente = await getClienteByUserId(userId); // 🔥 Buscamos TODO de la base de datos
      const nombre = cliente?.nombre || 'Paciente';
      const obraSocial = cliente?.obraSocial || '';
      const telefono = cliente?.telefono || '';
  
      const selectedDate = await state.get('selectedDate');
  
      try {
        await assignSlot(selectedDate, selectedTime, `${nombre} - ${obraSocial}`, telefono); // 🔥 pasamos teléfono bien ahora
        await flowDynamic(
          `🛎️ *Turno reservado exitosamente* para *${nombre}*.\n\n` +
          `📅 Fecha: ${selectedDate}\n` +
          `🕒 Horario: ${selectedTime}\n\n` +
          '🤗 ¡Te esperamos con mucho gusto! 🎉'
        );
        await resetUserData(state);
  
        await flowDynamic('➡️ Escribe *volver* para regresar al menú principal o *salir* para finalizar la conversación.');
      } catch (error) {
        console.error(error);
        await flowDynamic(
          `❌ Hubo un error al reservar tu turno. Por favor, inténtalo de nuevo más tarde.`
        );
      }
    }
  )
  .addAnswer(
    '',
    { capture: true },
    async (ctx, { gotoFlow, flowDynamic }) => {
      const opcion = ctx.body.trim().toLowerCase();
  
      if (opcion === 'volver') {
        await flowDynamic('🔙 Volviendo al menú principal...');
        return gotoFlow(mainMenuFlow);
      } else if (opcion === 'salir') {
        await flowDynamic('👋 ¡Gracias por comunicarte! ¡Que tengas un excelente día! ✨');
        return;
      } else {
        await flowDynamic('❌ Opción inválida. Escribe *volver* o *salir*.');
      }
    }
  );



// **Inicialización del Bot**
const main = async () => {
  const adapterFlow = createFlow([
    adminValidationFlow, 
    userDataFlow,
    initialValidationFlow,
    mainMenuFlow,
    availableMonthsFlow,
    adminFlow,
    cancelTurnoFlow,
  ]);

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: new Database(),
  });



  httpServer(+PORT);

};

main();