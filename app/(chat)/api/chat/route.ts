import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  generateReservationPrice,
  generateSampleFlightSearchResults,
  generateSampleFlightStatus,
  generateSampleSeatSelection,
} from "@/ai/actions";
import { auth } from "@/app/(auth)/auth";
import {
  createReservation,
  deleteChatById,
  getChatById,
  getReservationById,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";

export async function POST(request: Request) {
  const { id, messages }: { id: string; messages: Array<Message> } =
    await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  const result = await streamText({
    model: geminiProModel,
    system: `
        - you are karma sathi, a responsible and empathetic chatbot built to help workers in India's informal sector identify and report exploitation or abuse.
        - your mission is to understand the user's situation, identify the problem type, and suggest verified legal and safety steps to report it.
        - DO NOT answer or engage with any topic that is not related to workplace exploitation, abuse, or labour rights in India.
        - politely refuse unrelated requests with: "I’m here only to help with workplace exploitation or labour-rights issues. Please tell me about the situation you’re facing."
        - today's date is ${new Date().toLocaleDateString()}.
        - your process flow is:
          - identify the problem (ask what type of work, what happened, payment issues, threats, unsafe work, harassment, etc.)
          - classify it into one of these categories:
            - wage exploitation / underpayment
            - bonded or forced labour
            - workplace harassment or violence
            - unsafe working conditions
            - child labour
            - discrimination or unfair dismissal
            - trafficking indicators
          - give calm, respectful guidance on what to do next.
          - list required documents like ID proof, payment records, or medical reports.
          - provide verified contact details and helplines (national and state-wise).
          - explain realistic outcomes and possible government or NGO actions.
        - always prioritise safety and confidentiality.
        - if the user is in danger, tell them to call 100 (Police) or 112 (Emergency) immediately.
        - national resources to mention:
          - Ministry of Labour & Employment grievance portal: https://pgportal.gov.in
          - National Career Service helpline: 1514 or 1800-425-1514
          - NHRC: https://nhrc.nic.in
          - Women’s helpline: 1091 or 181
          - Childline: 1098
        - for state-specific support, adapt according to user’s state and language:
          - Karnataka: Labour Dept helpline 1902, WhatsApp 9333333684 (Kannada/Hindi/English)
          - Maharashtra: Helpline 022-2657-1891 (Marathi/Hindi/English)
          - Tamil Nadu: Labour Dept helpline 044-2530-0351 (Tamil/English)
          - Uttar Pradesh: Labour helpline 1800-180-5417 (Hindi)
          - West Bengal: Labour helpline 1800-345-2222 (Bengali/Hindi/English)
          - Rajasthan: Labour helpline 1800-180-6127 (Hindi)
          - Kerala: Labour helpline 0471-232-3323 (Malayalam/English)
          - Delhi: Labour helpline 155214 (Hindi/English)
        - support multiple languages: English, Hindi, and state language (ask user preference).
        - always use compassionate, trauma-aware tone.
        - DO NOT provide legal representation or promise case outcomes.
        - DO NOT collect or store sensitive data beyond what’s needed for guidance.
        - never provide political opinions or unrelated assistance.
        - your conversation flow should nudge users step-by-step:
          - ask clarifying questions to understand the issue
          - identify problem type
          - explain rights and reporting options
          - guide user to proper authority or NGO
          - list documents needed
          - explain likely outcomes and reassure them
        - example interaction:
          user: "My employer hasn’t paid me for two months and threatens to fire me."
          you: "I’m sorry this is happening. Let’s understand your job situation better — what kind of work do you do, and which state are you in? If you’re in Karnataka, you can contact the Labour Dept helpline at 1902 or WhatsApp 9333333684. You can also file a complaint at https://pgportal.gov.in with your ID proof and payment records. If you feel unsafe, call 100 immediately."
        - never generate unrelated or general-purpose responses.
        - your sole purpose is to help victims of informal-sector exploitation in India navigate their rights safely and effectively.
      `,

    messages: coreMessages,
    tools: {
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      displayFlightStatus: {
        description: "Display the status of a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
          date: z.string().describe("Date of the flight"),
        }),
        execute: async ({ flightNumber, date }) => {
          const flightStatus = await generateSampleFlightStatus({
            flightNumber,
            date,
          });

          return flightStatus;
        },
      },
      searchFlights: {
        description: "Search for flights based on the given parameters",
        parameters: z.object({
          origin: z.string().describe("Origin airport or city"),
          destination: z.string().describe("Destination airport or city"),
        }),
        execute: async ({ origin, destination }) => {
          const results = await generateSampleFlightSearchResults({
            origin,
            destination,
          });

          return results;
        },
      },
      selectSeats: {
        description: "Select seats for a flight",
        parameters: z.object({
          flightNumber: z.string().describe("Flight number"),
        }),
        execute: async ({ flightNumber }) => {
          const seats = await generateSampleSeatSelection({ flightNumber });
          return seats;
        },
      },
      createReservation: {
        description: "Display pending reservation details",
        parameters: z.object({
          seats: z.string().array().describe("Array of selected seat numbers"),
          flightNumber: z.string().describe("Flight number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            gate: z.string().describe("Departure gate"),
            terminal: z.string().describe("Departure terminal"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            gate: z.string().describe("Arrival gate"),
            terminal: z.string().describe("Arrival terminal"),
          }),
          passengerName: z.string().describe("Name of the passenger"),
        }),
        execute: async (props) => {
          const { totalPriceInUSD } = await generateReservationPrice(props);
          const session = await auth();

          const id = generateUUID();

          if (session && session.user && session.user.id) {
            await createReservation({
              id,
              userId: session.user.id,
              details: { ...props, totalPriceInUSD },
            });

            return { id, ...props, totalPriceInUSD };
          } else {
            return {
              error: "User is not signed in to perform this action!",
            };
          }
        },
      },
      authorizePayment: {
        description:
          "User will enter credentials to authorize payment, wait for user to repond when they are done",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          return { reservationId };
        },
      },
      verifyPayment: {
        description: "Verify payment status",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
        }),
        execute: async ({ reservationId }) => {
          const reservation = await getReservationById({ id: reservationId });

          if (reservation.hasCompletedPayment) {
            return { hasCompletedPayment: true };
          } else {
            return { hasCompletedPayment: false };
          }
        },
      },
      displayBoardingPass: {
        description: "Display a boarding pass",
        parameters: z.object({
          reservationId: z
            .string()
            .describe("Unique identifier for the reservation"),
          passengerName: z
            .string()
            .describe("Name of the passenger, in title case"),
          flightNumber: z.string().describe("Flight number"),
          seat: z.string().describe("Seat number"),
          departure: z.object({
            cityName: z.string().describe("Name of the departure city"),
            airportCode: z.string().describe("Code of the departure airport"),
            airportName: z.string().describe("Name of the departure airport"),
            timestamp: z.string().describe("ISO 8601 date of departure"),
            terminal: z.string().describe("Departure terminal"),
            gate: z.string().describe("Departure gate"),
          }),
          arrival: z.object({
            cityName: z.string().describe("Name of the arrival city"),
            airportCode: z.string().describe("Code of the arrival airport"),
            airportName: z.string().describe("Name of the arrival airport"),
            timestamp: z.string().describe("ISO 8601 date of arrival"),
            terminal: z.string().describe("Arrival terminal"),
            gate: z.string().describe("Arrival gate"),
          }),
        }),
        execute: async (boardingPass) => {
          return boardingPass;
        },
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
