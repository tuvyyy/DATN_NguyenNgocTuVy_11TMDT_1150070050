import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { operationsHubUrl, operationsToken } from "../api/OperationsApi";

export const createOperationsConnection = () =>
  new HubConnectionBuilder()
    .withUrl(operationsHubUrl(), { accessTokenFactory: operationsToken })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build();
