import { io } from "socket.io-client";

const socketUrl = "";

export const socket = io(socketUrl, {
  autoConnect: false,
  auth: {
    accessToken: "",
  },
});
