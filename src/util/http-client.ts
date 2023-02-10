/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosRequestConfig, AxiosResponse } from "axios";

import { Debug } from "./debug";
import axios from "axios";

const debug = Debug();

export type HTTPErrorData = {
  status: number;
  statusText: string;
  error: string;
};
function handleError(err: any) {
  debug("response error: ", err.response);
  const { status, statusText, data } = err.response;
  return Promise.reject({
    status,
    statusText,
    error: data.error,
  });
}

function handleResponse<T>(resp: AxiosResponse<T>) {
  debug("response: ", resp.data);
  return resp.data;
}

export class HTTPClient {
  baseURL: string;
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  private config(options: AxiosRequestConfig) {
    const { baseURL, headers = {}, ...rest } = options;
    return {
      baseURL: baseURL || this.baseURL,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      ...rest,
    };
  }
  async post<T = any>(
    url: string,
    data: any,
    options: AxiosRequestConfig = {}
  ) {
    return axios
      .post<T>(url, data, this.config(options))
      .then(handleResponse)
      .catch(handleError);
  }
  async get<T = any>(
    url: string,
    params: any = undefined,
    options: AxiosRequestConfig = {}
  ) {
    return axios
      .get<T>(url, this.config({ ...options, params }))
      .then(handleResponse)
      .catch(handleError);
  }
  async del<T = any>(
    url: string,
    params: any,
    options: AxiosRequestConfig = {}
  ) {
    return axios
      .delete<T>(url, this.config({ ...options, params }))
      .then(handleResponse)
      .then(handleError);
  }
  async put<T = any>(url: string, data: any, options: AxiosRequestConfig = {}) {
    return axios
      .put<T>(url, data, this.config(options))
      .then(handleResponse)
      .catch(handleError);
  }
}
