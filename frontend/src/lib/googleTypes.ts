export class SheetsApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SheetsApiError';
    this.status = status;
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Google API rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class OfflineError extends Error {
  constructor(message: string = 'Network is offline') {
    super(message);
    this.name = 'OfflineError';
  }
}

declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }

  namespace gapi {
    function load(apiName: string, callback: () => void): void;

    namespace client {
      function init(args: {
        apiKey?: string;
        discoveryDocs?: string[];
        clientId?: string;
        scope?: string;
      }): Promise<void>;

      function setToken(token: { access_token: string } | null): void;
      function getToken(): { access_token: string } | null;

      namespace drive {
        namespace files {
          function create(args: {
            resource: { name: string; mimeType: string };
            fields?: string;
          }): Promise<{ result: { id: string; name: string } }>;
        }
      }

      namespace sheets {
        namespace spreadsheets {
          function create(args: {
            resource: {
              properties: { title: string };
            };
          }): Promise<{ result: { spreadsheetId: string; spreadsheetUrl: string } }>;

          function batchUpdate(args: {
            spreadsheetId: string;
            resource: {
              requests: any[];
            };
          }): Promise<{ result: { replies: any[] } }>;

          namespace values {
            function get(args: {
              spreadsheetId: string;
              range: string;
            }): Promise<{ result: { values?: string[][] } }>;

            function update(args: {
              spreadsheetId: string;
              range: string;
              valueInputOption: string;
              resource: { values: any[][] };
            }): Promise<any>;

            function batchGet(args: {
              spreadsheetId: string;
              ranges: string[];
            }): Promise<{ result: { valueRanges: { range: string; values?: string[][] }[] } }>;

            function batchUpdate(args: {
              spreadsheetId: string;
              resource: {
                valueInputOption: string;
                data: { range: string; values: any[][] }[];
              };
            }): Promise<any>;

            function append(args: {
              spreadsheetId: string;
              range: string;
              valueInputOption: string;
              resource: { values: any[][] };
            }): Promise<any>;
          }
        }
      }
    }
  }

  namespace google {
    namespace accounts {
      namespace oauth2 {
        interface TokenResponse {
          access_token: string;
          expires_in: number;
          scope: string;
          token_type: string;
          error?: string;
        }

        interface TokenClientConfig {
          client_id: string;
          scope: string;
          callback: (response: TokenResponse) => void;
          error_callback?: (error: any) => void;
        }

        interface TokenClient {
          callback?: (response: TokenResponse) => void;
          requestAccessToken(options?: { prompt?: string }): void;
        }

        function initTokenClient(config: TokenClientConfig): TokenClient;
      }
    }
  }
}
