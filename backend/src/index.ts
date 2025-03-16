import express, { Request, Response } from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
const cors = require('cors')



const app = express()

app.use(cors())

app.use(express.json())


