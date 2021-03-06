/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { ClientRequestContext, Config, Guid } from "@bentley/bentleyjs-core";
import { FrontendAuthorizationClient } from "@bentley/frontend-authorization-client";
import { IModelBankClient } from "@bentley/imodelhub-client";
import { IModelBankBasicAuthorizationClient } from "@bentley/imodelhub-client/lib/imodelbank/IModelBankBasicAuthorizationClient";
import { BentleyCloudRpcManager } from "@bentley/imodeljs-common";
import { IModelApp, IModelAppOptions } from "@bentley/imodeljs-frontend";
import { Presentation } from "@bentley/presentation-frontend";
import { AppNotificationManager, UiFramework } from "@bentley/ui-framework";
import { getSupportedRpcs } from "../../common/rpcs";
import { IncidentMarkerDemoTool } from "../api/IncidentClusterMarker";
import MarkerPinApp from "../api/MarkerPinApp";
import { PlaceMarkerTool } from "../api/PlaceMarkerTool";
import { DeleteElementTool, SelectSignalTool, TestTool } from "../app-ui/frontstages/Feature";
import { AppState, AppStore } from "./AppState";

/**
 * List of possible backends that ninezone-sample-app can use
 */
export enum UseBackend {
  /** Use local ninezone-sample-app backend */
  Local = 0,

  /** Use deployed general-purpose backend */
  GeneralPurpose = 1,
}

// subclass of IModelApp needed to use imodeljs-frontend
export class NineZoneSampleApp {
  private static _appState: AppState;

  public static get oidcClient(): FrontendAuthorizationClient { return IModelApp.authorizationClient as FrontendAuthorizationClient; }

  public static get store(): AppStore { return this._appState.store; }

  public static async startup(): Promise<void> {
    const opts: IModelAppOptions = {};
    opts.notifications = new AppNotificationManager();
    opts.applicationVersion = "1.0.0";
    const url = Config.App.get("imjs_imodelbank_url");
    const imodelClient = new IModelBankClient(url, undefined);
    opts.imodelClient = imodelClient;
    // iTwinStack: Setup IModelBankBasicAuthorizationClient from username and password in config
    const email = Config.App.get("imjs_imodelbank_user");
    const password = Config.App.get("imjs_imodelbank_password");
    opts.authorizationClient = new IModelBankBasicAuthorizationClient({id: Guid.createValue()}, {email, password});

    
    await IModelApp.startup(opts);
    await IModelApp.authorizationClient?.signIn(new ClientRequestContext());

    // contains various initialization promises which need
    // to be fulfilled before the app is ready
    const initPromises = new Array<Promise<any>>();

    // initialize RPC communication
    initPromises.push(NineZoneSampleApp.initializeRpc());

    // initialize localization for the app
    initPromises.push(IModelApp.i18n.registerNamespace("NineZoneSample").readFinished);

    // create the application state store for Redux
    this._appState = new AppState();

    // initialize UiFramework
    initPromises.push(UiFramework.initialize(this.store, IModelApp.i18n));
    initPromises.push(NineZoneSampleApp.registerTool());
    // initialize Presentation
    initPromises.push(Presentation.initialize({
      activeLocale: IModelApp.i18n.languageList()[0],
    }));

    // the app is ready when all initialization promises are fulfilled
    await Promise.all(initPromises);
  }
  private static async registerTool() {
    await IModelApp.i18n.registerNamespace("NineZoneSample").readFinished;
    SelectSignalTool.register(IModelApp.i18n.getNamespace("NineZoneSample"));
    DeleteElementTool.register(IModelApp.i18n.getNamespace("NineZoneSample"));
    PlaceMarkerTool.register(IModelApp.i18n.getNamespace("NineZoneSample"));
    IncidentMarkerDemoTool.register(IModelApp.i18n.getNamespace("NineZoneSample"));
  }
  private static async initializeRpc(): Promise<void> {
    const rpcInterfaces = getSupportedRpcs();
    const rpcParams = { info: { title: "ninezone-sample-app", version: "v1.0" }, uriPrefix: "http://localhost:3001" };
    BentleyCloudRpcManager.initializeClient(rpcParams, rpcInterfaces);
  }
}
