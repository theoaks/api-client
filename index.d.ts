
declare module "theoaksoft-api-client" {
    export = ApiClient;
}

declare module "api-client" {
    export = ApiClient;
}

declare const ApiClient: ApiClientStatic;

interface ApiResponse {
    success: boolean,
    message: string,
    data: any,
    metadata: any
}

interface ApiClientStatic {
    new(baseUrl: string, authToken: string, publicKey: string): OaksEncryptorStatic;

    send(
        module: string,
        action: string,
        options: {
            method: string,
            data: any
        }
    ): Promise<ApiResponse>;

    sendForm(
        module: string,
        action: string,
        form: HTMLFormElement
    ): Promise<ApiResponse>;
}