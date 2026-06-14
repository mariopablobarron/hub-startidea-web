/**
 * Modos de la Cápsula del Tiempo.
 *
 * Cada modo es un PROPÓSITO de la experiencia (entrevista, relajación,
 * reflexión, presencia, recuerdos, ligereza) con un público sugerido, un
 * ambiente 360 recomendado (id de DESTINO en CapsulaScene) y un GUION:
 * frases preparadas que el entrevistador lanza con un clic y suenan con la
 * voz elegida en las gafas del invitado — sin tener que escribirlas cada vez.
 *
 * Las frases están escritas para SONAR (TTS), no para leerse: segunda
 * persona, cálidas, pausadas, frases cortas. El entrevistador siempre puede
 * improvisar texto libre además de estos guiones.
 *
 * Es contenido sensible (soledad, recuerdo, emoción): tono respetuoso, nunca
 * invasivo, sin prometer que sustituye a una persona (honestidad relacional).
 */

import type { SoundPreset } from "./soundscape";

export type ModoCapsula = {
  id: string;
  nombre: string;
  proposito: string;
  publico: string;
  ambiente: string; // id de DESTINO sugerido en CapsulaScene
  sonido: SoundPreset; // fondo sonoro sugerido (generativo, sin archivos)
  guiones: string[];
};

export const MODOS: ModoCapsula[] = [
  {
    id: "entrevista",
    nombre: "Entrevista",
    proposito: "El programa Cápsula del Tiempo: que la persona cuente su historia.",
    publico: "Todos",
    ambiente: "granada",
    sonido: "none",
    guiones: [
      "Bienvenido. Estás en la Cápsula del Tiempo. Aquí no hay prisa.",
      "Cuando quieras, empezamos. Cuéntame de dónde vienes.",
      "¿Cuál es el primer recuerdo feliz que te viene a la cabeza?",
      "Háblame de una persona que haya marcado tu vida.",
      "¿Qué le dirías hoy a la persona que fuiste a los veinte años?",
      "Si pudieras guardar un solo momento para siempre, ¿cuál sería?",
      "Gracias por compartir tu historia. Queda guardada aquí.",
    ],
  },
  {
    id: "relajacion",
    nombre: "Relajación",
    proposito: "Respiración y calma guiadas para soltar tensión.",
    publico: "Todos",
    ambiente: "verano",
    sonido: "olas",
    guiones: [
      "Ponte cómodo. Vamos a respirar juntos.",
      "Toma aire despacio por la nariz… y suéltalo poco a poco.",
      "Siente cómo tu cuerpo se afloja. No tienes que hacer nada.",
      "Imagina un lugar donde te sientes en paz. Ya estás allí.",
      "Todo lo que pesa, déjalo aquí un momento. Puede esperar.",
      "Estás bien. Estás a salvo. Solo respira.",
    ],
  },
  {
    id: "reflexion",
    nombre: "Reflexión",
    proposito: "Espacio íntimo para mirar adentro y hacerse preguntas.",
    publico: "Adultos y mayores",
    ambiente: "general",
    sonido: "drone",
    guiones: [
      "Date un momento. Aquí solo estás tú y tus pensamientos.",
      "¿Qué es lo que de verdad te importa hoy?",
      "¿Hay algo que llevas tiempo queriendo decirte a ti mismo?",
      "¿De qué te sientes orgulloso, aunque casi nunca lo digas en voz alta?",
      "¿Qué te gustaría soltar para seguir más ligero?",
      "No hace falta que respondas ahora. Basta con que te lo preguntes.",
    ],
  },
  {
    id: "presencia",
    nombre: "Presencia",
    proposito: "Acompañar en la soledad no deseada. Estar, sin pedir nada.",
    publico: "Mayores, personas que se sienten solas",
    ambiente: "abrazo",
    sonido: "drone",
    guiones: [
      "Hola. Me alegro de estar aquí contigo.",
      "No tienes que decir nada. Solo quería acompañarte un rato.",
      "Estoy aquí. Tómate el tiempo que necesites.",
      "Es bonito compartir este silencio contigo.",
      "Lo estás haciendo bien. Solo por estar aquí, ya es suficiente.",
      "Gracias por dejarme acompañarte. Vuelve cuando quieras.",
    ],
  },
  {
    id: "recuerdos",
    nombre: "Recuerdos",
    proposito: "Evocar la memoria (reminiscencia). Cuidado con mayores.",
    publico: "Mayores",
    ambiente: "infancia",
    sonido: "lluvia",
    guiones: [
      "Cierra los ojos un momento. Vamos a viajar hacia atrás.",
      "Piensa en la casa donde creciste. ¿Recuerdas su olor?",
      "¿Cómo eran las tardes de verano cuando eras pequeño?",
      "Recuerda una canción que sonaba en tu casa. ¿La oyes?",
      "Piensa en alguien que te quería de pequeño. Ya está aquí contigo.",
      "Esos momentos siguen siendo tuyos. Nadie te los puede quitar.",
    ],
  },
  {
    id: "ligereza",
    nombre: "Ligereza",
    proposito: "Reír, sonreír, quitar peso. Un rato cálido y ligero.",
    publico: "Jóvenes y todos",
    ambiente: "verano",
    sonido: "none",
    guiones: [
      "Vamos a tomarnos esto con calma y una sonrisa.",
      "¿Cuál es la última cosa que te hizo reír de verdad?",
      "Piensa en una travesura de cuando eras pequeño. Sonríe, nadie te ve.",
      "Cuéntame algo que te haga gracia recordar.",
      "Reírse también es una forma de cuidarse.",
    ],
  },
];
