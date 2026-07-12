declare module "tencentcloud-sdk-nodejs-ses" {
  export const ses: {
    v20201002: {
      Client: new (config: {
        credential: {
          secretId: string;
          secretKey: string;
        };
        region: string;
      }) => {
        SendEmail(args: {
          FromEmailAddress: string;
          Destination: string[];
          Cc?: string[];
          Subject: string;
          Template: {
            TemplateID: number;
            TemplateData: string;
          };
        }): Promise<Record<string, unknown>>;
      };
    };
  };
}
