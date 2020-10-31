/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import "@bentley/icons-generic-webfont/dist/bentley-icons-generic-webfont.css";
import { Point3d } from "@bentley/geometry-core";
import { IModelApp, tryImageElementFromUrl } from "@bentley/imodeljs-frontend";
import { I18NNamespace } from "@bentley/imodeljs-i18n";
import { MarkerPinDecorator } from "./MarkerPinDecorator";
import { PlaceMarkerTool } from "./PlaceMarkerTool";

export default class MarkerPinApp {
  private static _sampleNamespace: I18NNamespace;
  private static _markerDecorator?: MarkerPinDecorator;
  public static _images: Map<string, HTMLImageElement>;

  public static async setup(){

    this._sampleNamespace = IModelApp.i18n.registerNamespace("NineZoneSample");

    PlaceMarkerTool.register(this._sampleNamespace);
     MarkerPinApp._images = new Map();
    const image = await tryImageElementFromUrl(".\\Google_Maps_pin.svg")
    if (image) {
    MarkerPinApp._images.set("Google_Maps_pin.svg", image);
    MarkerPinApp._images.set("pin_celery.svg", image);
    MarkerPinApp._images.set("pin_poloblue.svg", image);
    } else {
      alert("获取image失败");
    }

   // MarkerPinApp._images.set("Google_Maps_pin.svg", image);
    
   // console.log(MarkerPinApp._images.get("Google_Maps_pin.svg"));
    // try {
  
    // } catch (e) {
    //   console.log(e);
    // }

    // MarkerPinApp._images.set("Google_Maps_pin.svg", await imageElementFromUrl(".\\image\\Google_Maps_pin.svg"));
    // MarkerPinApp._images.set("pin_celery.svg", await imageElementFromUrl(".\\image\\pin_celery.svg"));
    // MarkerPinApp._images.set("pin_poloblue.svg", await imageElementFromUrl(".\\image\\pin_poloblue.svg"));
    // MarkerPinApp._images.set("Google_Maps_pin.svg", await imageElementFromUrl(".\\image\\Google_Maps_pin.svg"));
    // MarkerPinApp._images.set("pin_celery.svg", await imageElementFromUrl(".\\image\\pin_celery.svg"));
    // MarkerPinApp._images.set("pin_poloblue.svg", await imageElementFromUrl(".\\image\\pin_poloblue.svg"));
  }

  public static teardown() {
    MarkerPinApp.disableDecorations();
    MarkerPinApp._markerDecorator = undefined;

    IModelApp.i18n.unregisterNamespace("NineZoneSample");
    IModelApp.tools.unRegister(PlaceMarkerTool.toolId);
  }

  public static decoratorIsSetup() {
    return (null != this._markerDecorator);
  }

  public static setupDecorator(points: Point3d[]) {
    // If we failed to load the image, there is no point in registering the decorator
    if (!MarkerPinApp._images.has("Google_Maps_pin.svg"))
      return;

    this._markerDecorator = new MarkerPinDecorator();
    this.setMarkerPoints(points);
  }

  public static setMarkerPoints(points: Point3d[]) {
    if (this._markerDecorator)
      this._markerDecorator.setPoints(points, this._images.get("Google_Maps_pin.svg")!);
  }

  public static addMarkerPoint(point: Point3d, pinImage: HTMLImageElement) {
      if (this._markerDecorator)
      {
          this._markerDecorator.addPoint(point, pinImage);
     }
  }

  public static enableDecorations() {
    if (this._markerDecorator)
      IModelApp.viewManager.addDecorator(this._markerDecorator);
  }

  public static disableDecorations() {
    if (null != this._markerDecorator)
      IModelApp.viewManager.dropDecorator(this._markerDecorator);
  }
}
