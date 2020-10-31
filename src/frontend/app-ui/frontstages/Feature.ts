import { Config } from "@bentley/bentleyjs-core";
import { Angle, AnyRegion, Arc3d, CurveCurve, CurveFactory, CurveLocationDetailArrayPair, LineSegment3d, Loop, LowAndHighXYZ, Point3d, Range3d, Ray3d, RegionBinaryOpType, RegionOps, UnionRegion, Vector3d } from "@bentley/geometry-core";
import { ColorDef, GeometricElement3dProps, RenderMode } from "@bentley/imodeljs-common";
import { BeButtonEvent, BeWheelEvent, DecorateContext, Decorator, EventHandled, GeometricModel3dState, GraphicType, HitDetail, IModelApp, LocateFilterStatus, LocateResponse, PrimitiveTool, StandardViewId, Viewport } from "@bentley/imodeljs-frontend";
import { CommandItemDef, ItemList, SavedView, SavedViewProps, UiFramework } from "@bentley/ui-framework";
import ExportIFCInterface from "../../../common/ExportIFCInterface";
import SVTRpcInterface from "../../../common/SVTRpcInterface";
import { IncidentMarkerDemoTool } from "../../api/IncidentClusterMarker";
import MarkerPinApp from "../../api/MarkerPinApp";
import { PlaceMarkerTool } from "../../api/PlaceMarkerTool";
import { ViewCreator3d } from "../../api/ViewCreater3d";

export class TestFeature {
  public static CreateCommand(
    id: string,
    des: string,
    func: (args?: any) => any
  ): CommandItemDef {
    const testV1Def = new CommandItemDef({
      commandId: id,
      execute: func,
      iconSpec: "icon-developer",
      label: des,
      description: des,
      tooltip: des,
    });
    return testV1Def;
  }
  public static ItemLists = new ItemList([
    TestFeature.CreateCommand("TestSmoothShade", "平滑填充", TestSmoothShade),
    TestFeature.CreateCommand("TestDeSerializationView", "切换到保存视图", TestDeSerializationView),
    TestFeature.CreateCommand("RunSelectSignalTool", "运行盲区检测命令", RunSelectSignalTool),
    TestFeature.CreateCommand("TestShadow", "测试阴影", TestShadow),
    TestFeature.CreateCommand("AdjuctShadowDirectrion", "测试光照方向", AdjuctShadowDirectrion),
    TestFeature.CreateCommand("TestSerializationView", "保存当前视图至外部文件", TestSerializationView),
    TestFeature.CreateCommand("ExportIFC", "导出IFC", ExportIFC),
    TestFeature.CreateCommand("DeleteElement", "删除指定元素", DeleteElement),
    TestFeature.CreateCommand("PlaceMarker", "标记Mark", PlaceMarker),
  ]);
}
async function PlaceMarker() {
  await MarkerPinApp.setup();
  IModelApp.tools.run(IncidentMarkerDemoTool.toolId,manuallyAddMarker); 
}
export class DeleteElementTool extends PrimitiveTool {
    public static toolId = "DeleteElementTool";
    private id: string = '';
    public onPostInstall() {
        super.onPostInstall();
        this.setupAndPromptForNextAction();
  }
   public isCompatibleViewport(vp: Viewport | undefined, isSelectedViewChange: boolean): boolean { return (super.isCompatibleViewport(vp, isSelectedViewChange) && undefined !== vp && vp.view.isSpatialView()); }
    public isValidLocation(_ev: BeButtonEvent, _isButtonEvent: boolean): boolean { return true; } // Allow snapping to terrain, etc. outside project extents.
  public requireWriteableTarget(): boolean { return false; } // Tool doesn't modify the imodel.
    public setupAndPromptForNextAction(): void {
      //   IModelApp.notifications.outputPromptByKey(
      //   "SelectSignalTool run"
      // );
      IModelApp.accuSnap.enableSnap(true);
    }
    public async filterHit(
        _hit: HitDetail,
        _out?: LocateResponse
    ): Promise<LocateFilterStatus> {
        return LocateFilterStatus.Accept;
    }
    async getToolTip(_hit: HitDetail): Promise<HTMLElement | string> {
        return "hello,NBA2020";
    }
    public async onMouseWheel(_ev: BeWheelEvent): Promise<EventHandled> {
        return EventHandled.No;
    }
    public async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
        await IModelApp.locateManager.doLocate(
        new LocateResponse(),
        true,
        ev.point,
        ev.viewport,
        ev.inputSource
        );
      const hit = IModelApp.locateManager.currHit;
        if (hit !== undefined) {
        const props = await this.iModel.elements.getProps(hit.sourceId);
            if (props && props.length > 0) {     
              this.id = hit.sourceId;
              alert(hit.sourceId);
            }
        } 
        return EventHandled.No;
    }
    public async onResetButtonUp(_ev: BeButtonEvent): Promise<EventHandled> {
        await this.DeleteElement();
        IModelApp.toolAdmin.startDefaultTool();
        return EventHandled.No;
    }
    private async DeleteElement() {
        const id = this.id;
        await DeleteElementImp(id);
    }
    public onRestartTool(): void {
        const tool = new DeleteElementTool();
        if (!tool.run()) this.exitTool();
    }
}
async function DeleteElementImp(id:string) {
    const imodel = UiFramework.getIModelConnection()!;
    await imodel.editing.deleteElements([id]);
    imodel.saveChanges("delement element id =" + id);
    
    await TestSerializationView();
    await TestDeSerializationView();
}
export async function DeleteElement() {
      IModelApp.tools.run(DeleteElementTool.toolId); 
}
export async function TestSerializationView() {
  const vp = IModelApp.viewManager.selectedView!.view;
  const viewProp = SavedView.viewStateToProps(vp);
  const strViewProp = JSON.stringify(viewProp);
  const savedViewFilePath = Config.App.get("imjs_savedview_file");
  await SVTRpcInterface.getClient().writeExternalSavedViews(savedViewFilePath,strViewProp);
}
export async function TestDeSerializationView() {
  const savedViewFilePath = Config.App.get("imjs_savedview_file");
  const strViewProp = await SVTRpcInterface.getClient().readExternalSavedViews(savedViewFilePath);
  const vp = IModelApp.viewManager.selectedView!;
  const viewProp: SavedViewProps = JSON.parse(strViewProp);
  const imodel = UiFramework.getIModelConnection()!;
  const viewState = await SavedView.viewStateFromProps(imodel, viewProp);
  if (viewState) {
    vp.changeView(viewState);
 }
}
async function  TestSmoothShade() {
  const vp = IModelApp.viewManager.selectedView!;
  let vf = vp.viewFlags.clone();
  vf.renderMode = RenderMode.SmoothShade;
  vf.acsTriad = !vf.acsTriad;
  vf.shadows = !vf.shadows;
  vf.fill = !vf.fill;
  vp.viewFlags = vf;
}
export async function TestShadow() {
  const imodel = UiFramework.getIModelConnection()!;
  const models = await imodel.models.queryProps({ from: GeometricModel3dState.classFullName });
  const modelIds: string[] = [];
  for (const model of models) {
    modelIds.push(model.id!);
  }
    const viewCreator3d: ViewCreator3d = new ViewCreator3d(imodel);
  let view3d = await viewCreator3d.createDefaultView(
    {
      cameraOn: true,
      skyboxOn: true,
      useSeedView: true,
      standardViewId: StandardViewId.Front,
    },
    modelIds
  );

  const vp = IModelApp.viewManager.selectedView!;
  let vf = vp.viewFlags.clone();
  vf.shadows = !vf.shadows;
  vf.renderMode = RenderMode.SmoothShade;
  vp.viewFlags = vf;
  vp.changeView(view3d);
  await TestDeSerializationView();
}
async function RunSelectSignalTool() {
  IModelApp.tools.run(SelectSignalTool.toolId); 
}
async function AdjuctShadowDirectrion() {
}
export class SelectSignalTool extends PrimitiveTool {
  public static toolId = "SelectSignalTool";
  public readonly points: Point3d[] = [];

  public requireWriteableTarget(): boolean {
    return false;
  }
  public onPostInstall() {
    super.onPostInstall();
    this.setupAndPromptForNextAction();
  }
  public setupAndPromptForNextAction(): void {
    IModelApp.notifications.outputPromptByKey(
      "SelectSignalTool run"
    );
  }
  public async filterHit(
    _hit: HitDetail,
    _out?: LocateResponse
  ): Promise<LocateFilterStatus> {
    return LocateFilterStatus.Accept;
  }
  async getToolTip(_hit: HitDetail): Promise<HTMLElement | string> {
    return "hello,NBA2020";
  }
  public async onMouseWheel(_ev: BeWheelEvent): Promise<EventHandled> {
    return EventHandled.No;
  }
  public async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
    await IModelApp.locateManager.doLocate(
      new LocateResponse(),
      true,
      ev.point,
      ev.viewport,
      ev.inputSource
    );
    const hit = IModelApp.locateManager.currHit;
    this.points.push(ev.point);
    if (hit !== undefined) {
    const props = await this.iModel.elements.getProps(hit.sourceId);
      if (props && props.length > 0) {
        await this.createMesh();      
      }
    } 
    return EventHandled.No;
  }
  public async onResetButtonUp(_ev: BeButtonEvent): Promise<EventHandled> {
    await this.DeleteDecorator();
    IModelApp.toolAdmin.startDefaultTool();
    return EventHandled.No;
  }
  private Cal2Point3dDistance(p1:Point3d,p2:Point3d) {
    const dis = (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y) + (p1.z - p2.z) * (p1.z - p2.z);
    return Math.sqrt(dis);
  }
  private doc: Decorator | undefined = undefined;
  private docShadow:Decorator | undefined = undefined;
  private async createMesh() {
    if (this.points.length === 0) {
      alert("点的个数为0");
      return;
    }
    //信号灯ID
    const lightId = "0x200000001db";
    //柱子ID
    const pillarId = "0x200000000ad";
    const lightRange = await this.QueryElementRange3d(lightId);
    const pillarRange = await this.QueryElementRange3d(pillarId);
    if (!lightRange || !pillarRange) {
      alert("灯或者柱子的范围不合法");
      return;
    }
    
    const pillarRangeMaxDistance = this.CalRangeMaxDistance(pillarRange.ranger);

    const lightOrigin = lightRange.origin;
    
    //圆柱子
    let pillarOrigin = pillarRange.origin;
    pillarOrigin.z = lightOrigin.z;
  
    const dis = this.Cal2Point3dDistance(lightOrigin, pillarOrigin);
  
    const sin = pillarRangeMaxDistance / dis;
    const angle = Math.asin(sin);
  
    const v = new Vector3d(pillarOrigin.x - lightOrigin.x, pillarOrigin.y - lightOrigin.y);
    const v1 = v.rotateXY(Angle.createRadians(angle));
    const v2 = v.rotateXY(Angle.createRadians(-angle));

    const r3d1 = Ray3d.create(lightOrigin, v1);
    const r3d2 = Ray3d.create(lightOrigin, v2);
    const p1 = r3d1.projectPointToRay(pillarOrigin);
    const p2 = r3d2.projectPointToRay(pillarOrigin);

    const seg1 = LineSegment3d.create(lightOrigin, p1);
    const seg2 = LineSegment3d.create(lightOrigin, p2);

    const p3 = seg1.fractionToPoint(4);
    const p4 = seg2.fractionToPoint(4);
    const seg3 = LineSegment3d.create(lightOrigin, p3);
    const seg4 = LineSegment3d.create(lightOrigin, p4);

    let p = this.points[0];
    p.z = lightOrigin.z;
    const vn = new Vector3d(p.x - lightOrigin.x, p.y - lightOrigin.y);
    const cn = new Vector3d(vn.y, -vn.x);
    const newArd = CurveFactory.createArcPointTangentPoint(lightOrigin, cn, p);
    //////////////////////////////////////////////////
    const lightAngle = Math.PI / 9;
    const targetPoint = this.points[0];
    //中轴向量
    const axisVec = new Vector3d(targetPoint.x - lightOrigin.x, targetPoint.y - lightOrigin.y,targetPoint.z - lightOrigin.z);
   //光线的边界向量
    const leftVec = axisVec.rotateXY(Angle.createRadians(lightAngle));
    const rightVec = axisVec.rotateXY(Angle.createRadians(-lightAngle));
    //光线的边界射线
    const leftRay3d = Ray3d.create(lightOrigin, leftVec);
    const rightRay3d = Ray3d.create(lightOrigin, rightVec);

    //目标点在边界射线投影
    const leftProjectPoint = leftRay3d.projectPointToRay(targetPoint);
    const rightProjectPoitn = rightRay3d.projectPointToRay(targetPoint);

    const s1 = LineSegment3d.create(lightOrigin, leftProjectPoint);
    const s3 = LineSegment3d.create(lightOrigin, rightProjectPoitn);
    const arc = Arc3d.createCircularStartMiddleEnd(leftProjectPoint, targetPoint, rightProjectPoitn);
   
    
    const intersePointLeft: CurveLocationDetailArrayPair = CurveCurve.intersectionXYZ(newArd!, true, seg3, true);
    const intersePointRight: CurveLocationDetailArrayPair = CurveCurve.intersectionXYZ(newArd!, true, seg4, true);

    let lightLoop = Loop.createArray([s1, arc!, s3]);
    let loop: AnyRegion | undefined = undefined;
    let shadowLoop: Loop | undefined = undefined;
    if ( intersePointLeft && intersePointLeft.dataA.length > 0 && intersePointRight.dataA.length > 0) {
      const pi1 = intersePointLeft.dataA[0].point;
      const pi2 = intersePointRight.dataA[0].point;
      const line1 = LineSegment3d.create(lightOrigin, pi1);
      const line2 = LineSegment3d.create(lightOrigin, pi2);
      
      const psi1 = line1.fractionToPoint(4);
      const psi2 = line2.fractionToPoint(4);
      const obstacleLoop = Loop.createPolygon([p1, p2, psi2, psi1]);
      const intersection = RegionOps.regionBooleanXY(lightLoop, obstacleLoop, RegionBinaryOpType.Intersection);	
      if (intersection as UnionRegion) {
        shadowLoop = (intersection as UnionRegion).getChild(0) as Loop;
      }
      if (intersection) {
        loop = RegionOps.regionBooleanXY(lightLoop, intersection, RegionBinaryOpType.AMinusB);
        console.log(loop);
      }
    }

    if (this.doc) {
      IModelApp.viewManager.dropDecorator(this.doc);
    }
    if (this.docShadow) {
      IModelApp.viewManager.dropDecorator(this.docShadow);
    }
    if (loop) {
      const uu = loop as UnionRegion;
      this.doc = new CustomDecorator(uu.getChild(0) as Loop,ColorDef.from(0, 255, 0, 128));
      IModelApp.viewManager.addDecorator(this.doc); 
    }
    if (shadowLoop) {
      this.docShadow = new CustomDecorator(shadowLoop, ColorDef.from(47, 79, 79, 128));
      IModelApp.viewManager.addDecorator(this.docShadow);
    }
  }
  private  async DeleteDecorator() {
    if (this.doc) {
      IModelApp.viewManager.dropDecorator(this.doc);
    }
    if (this.docShadow) {
      IModelApp.viewManager.dropDecorator(this.docShadow);
    }
  }
  public onRestartTool(): void {
    const tool = new SelectSignalTool();
    if (!tool.run()) this.exitTool();
  }
  private CalRangeMaxDistance(range: Range3d): number{
    //圆柱子;
    //const maxDistance = Math.max(range.low.x, range.low.y, range.high.x, range.high.y)/1.8;
    //方柱子;
    const maxDistance = Math.max(range.xLength(), range.yLength())/2;
    return maxDistance;
  }
  private async QueryElementRange3d(id: string) {
    const imodel = UiFramework.getIModelConnection()!;
    const elementprops = await imodel.elements.getProps(id);
    if (elementprops && elementprops.length > 0) {
      const eleProps = elementprops[0];
      const geom: GeometricElement3dProps = eleProps as GeometricElement3dProps;
      if (geom && geom.placement) {
        const place = geom.placement;
        if (place.bbox) {
          const box: Readonly<LowAndHighXYZ> = place.bbox;
          const ranger = Range3d.fromJSON(box);
          const origin = Point3d.fromJSON(place.origin);
          //console.log(geom);
          return {ranger,origin};
        }
      }
    }
    return null;
  }
}

async function  ExportIFC() {
  
  const token = UiFramework.getIModelConnection()!.getRpcProps();
  if (!token) {
    alert("toeken无效请检查");
    return;
  }
  //  const imodelId = Config.App.get("imjs_test_imodel_id");
  //  //const contextId = Config.App.get("imjs_test_context_id");
  // //const hubmodel = await IModelApp.iModelClient.iModel.get(requestContext, contextId);
  // const hu = await IModelApp.iModelClient.briefcases.get(requestContext, imodelId);
  // if (hu) {
  //   alert(hu[0].fileName);
  // }
  //  const workDir = __dirname + "/../../lib/output/";
  //  await IModelApp.iModelClient.briefcases.download(requestContext, imodelId,workDir);
  //console.log(requestContext);
   await ExportIFCInterface.getClient().ExportIFCToFile(token, "4x3");
}

class CustomDecorator implements Decorator {
  public constructor(private _loop: Loop,private _color:ColorDef) {
  }
  public decorate(context: DecorateContext) {
    if (this._loop) {
      const overlayBuilder = context.createGraphicBuilder(GraphicType.WorldDecoration);
      overlayBuilder.setSymbology(this._color, this._color, 10);
      overlayBuilder.addLoop(this._loop);
      context.addDecorationFromBuilder(overlayBuilder);
    }
  }
}

function manuallyAddMarker(point: Point3d) {
  MarkerPinApp.setupDecorator([point]);
  MarkerPinApp.addMarkerPoint(point, MarkerPinApp._images.get("Google_Maps_pin.svg")!);
}

export class TestTool extends PrimitiveTool {
  public static toolId = "Test.MyTool"; // <== Used to find flyover (tool name), description, and keyin from namespace tool registered with...see CoreTools.json for example...
  public static iconSpec = "icon-star"; // <== Tool button should use whatever icon you have here...
  public readonly points: Point3d[] = [];

  constructor() {
    super();
  }

  public isCompatibleViewport(vp: Viewport | undefined, isSelectedViewChange: boolean): boolean { return (super.isCompatibleViewport(vp, isSelectedViewChange) && undefined !== vp && vp.view.isSpatialView()); }
  public isValidLocation(_ev: BeButtonEvent, _isButtonEvent: boolean): boolean { return true; } // Allow snapping to terrain, etc. outside project extents.
  public requireWriteableTarget(): boolean { return false; } // Tool doesn't modify the imodel.
  public onPostInstall() { super.onPostInstall(); this.setupAndPromptForNextAction(); }
  public onRestartTool(): void { this.exitTool(); }

  protected setupAndPromptForNextAction(): void {
    // Accusnap adjusts the effective cursor location to 'snap' to geometry in the view
    IModelApp.accuSnap.enableSnap(true);
  }

  // A reset button is the secondary action button, ex. right mouse button.
  public async onResetButtonUp(_ev: BeButtonEvent): Promise<EventHandled> {
    // this.onReinitialize(); // Calls onRestartTool to exit
    // return EventHandled.No;

    await this.DeleteDecorator();
    IModelApp.toolAdmin.startDefaultTool();
    return EventHandled.No;
  }
  private doc: Decorator | undefined = undefined;
  private docShadow:Decorator | undefined = undefined;
  // A data button is the primary action button, ex. left mouse button.
  public async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
    if (undefined === ev.viewport)
      return EventHandled.No; // Shouldn't really happen

    // ev.point is the current world coordinate point adjusted for snap and locks
        await IModelApp.locateManager.doLocate(
      new LocateResponse(),
      true,
      ev.point,
      ev.viewport,
      ev.inputSource
    );
    const hit = IModelApp.locateManager.currHit;
    this.points.push(ev.point);
    if (hit !== undefined) {
    const props = await this.iModel.elements.getProps(hit.sourceId);
      if (props && props.length > 0) {
        await this.createMesh();      
      }
    } 

    this.onReinitialize(); // Calls onRestartTool to exit
    return EventHandled.No;
  }
  private async createMesh() {
    if (this.points.length === 0) {
      alert("点的个数为0");
      return;
    }
    //信号灯ID
    const lightId = "0x200000001db";
    //柱子ID
    const pillarId = "0x200000000ad";
    const lightRange = await this.QueryElementRange3d(lightId);
    const pillarRange = await this.QueryElementRange3d(pillarId);
    if (!lightRange || !pillarRange) {
      alert("灯或者柱子的范围不合法");
      return;
    }
    
    const pillarRangeMaxDistance = this.CalRangeMaxDistance(pillarRange.ranger);

    const lightOrigin = lightRange.origin;
    
    //圆柱子
    let pillarOrigin = pillarRange.origin;
    pillarOrigin.z = lightOrigin.z;
  
    const dis = this.Cal2Point3dDistance(lightOrigin, pillarOrigin);
  
    const sin = pillarRangeMaxDistance / dis;
    const angle = Math.asin(sin);
  
    const v = new Vector3d(pillarOrigin.x - lightOrigin.x, pillarOrigin.y - lightOrigin.y);
    const v1 = v.rotateXY(Angle.createRadians(angle));
    const v2 = v.rotateXY(Angle.createRadians(-angle));

    const r3d1 = Ray3d.create(lightOrigin, v1);
    const r3d2 = Ray3d.create(lightOrigin, v2);
    const p1 = r3d1.projectPointToRay(pillarOrigin);
    const p2 = r3d2.projectPointToRay(pillarOrigin);

    const seg1 = LineSegment3d.create(lightOrigin, p1);
    const seg2 = LineSegment3d.create(lightOrigin, p2);

    const p3 = seg1.fractionToPoint(4);
    const p4 = seg2.fractionToPoint(4);
    const seg3 = LineSegment3d.create(lightOrigin, p3);
    const seg4 = LineSegment3d.create(lightOrigin, p4);

    let p = this.points[0];
    p.z = lightOrigin.z;
    const vn = new Vector3d(p.x - lightOrigin.x, p.y - lightOrigin.y);
    const cn = new Vector3d(vn.y, -vn.x);
    const newArd = CurveFactory.createArcPointTangentPoint(lightOrigin, cn, p);
    //////////////////////////////////////////////////
    const lightAngle = Math.PI / 9;
    const targetPoint = this.points[0];
    //中轴向量
    const axisVec = new Vector3d(targetPoint.x - lightOrigin.x, targetPoint.y - lightOrigin.y,targetPoint.z - lightOrigin.z);
   //光线的边界向量
    const leftVec = axisVec.rotateXY(Angle.createRadians(lightAngle));
    const rightVec = axisVec.rotateXY(Angle.createRadians(-lightAngle));
    //光线的边界射线
    const leftRay3d = Ray3d.create(lightOrigin, leftVec);
    const rightRay3d = Ray3d.create(lightOrigin, rightVec);

    //目标点在边界射线投影
    const leftProjectPoint = leftRay3d.projectPointToRay(targetPoint);
    const rightProjectPoitn = rightRay3d.projectPointToRay(targetPoint);

    const s1 = LineSegment3d.create(lightOrigin, leftProjectPoint);
    const s3 = LineSegment3d.create(lightOrigin, rightProjectPoitn);
    const arc = Arc3d.createCircularStartMiddleEnd(leftProjectPoint, targetPoint, rightProjectPoitn);
   
    
    const intersePointLeft: CurveLocationDetailArrayPair = CurveCurve.intersectionXYZ(newArd!, true, seg3, true);
    const intersePointRight: CurveLocationDetailArrayPair = CurveCurve.intersectionXYZ(newArd!, true, seg4, true);

    let lightLoop = Loop.createArray([s1, arc!, s3]);
    let loop: AnyRegion | undefined = undefined;
    let shadowLoop: Loop | undefined = undefined;
    if ( intersePointLeft && intersePointLeft.dataA.length > 0 && intersePointRight.dataA.length > 0) {
      const pi1 = intersePointLeft.dataA[0].point;
      const pi2 = intersePointRight.dataA[0].point;
      const line1 = LineSegment3d.create(lightOrigin, pi1);
      const line2 = LineSegment3d.create(lightOrigin, pi2);
      
      const psi1 = line1.fractionToPoint(4);
      const psi2 = line2.fractionToPoint(4);
      const obstacleLoop = Loop.createPolygon([p1, p2, psi2, psi1]);
      const intersection = RegionOps.regionBooleanXY(lightLoop, obstacleLoop, RegionBinaryOpType.Intersection);	
      if (intersection as UnionRegion) {
        shadowLoop = (intersection as UnionRegion).getChild(0) as Loop;
      }
      if (intersection) {
        loop = RegionOps.regionBooleanXY(lightLoop, intersection, RegionBinaryOpType.AMinusB);
        console.log(loop);
      }
    }

    if (this.doc) {
      IModelApp.viewManager.dropDecorator(this.doc);
    }
    if (this.docShadow) {
      IModelApp.viewManager.dropDecorator(this.docShadow);
    }
    if (loop) {
      const uu = loop as UnionRegion;
      this.doc = new CustomDecorator(uu.getChild(0) as Loop,ColorDef.from(0, 255, 0, 128));
      IModelApp.viewManager.addDecorator(this.doc); 
    }
    if (shadowLoop) {
      this.docShadow = new CustomDecorator(shadowLoop, ColorDef.from(47, 79, 79, 128));
      IModelApp.viewManager.addDecorator(this.docShadow);
    }
  }
  private  async DeleteDecorator() {
    if (this.doc) {
      IModelApp.viewManager.dropDecorator(this.doc);
    }
    if (this.docShadow) {
      IModelApp.viewManager.dropDecorator(this.docShadow);
    }
  }
    private async QueryElementRange3d(id: string) {
    const imodel = UiFramework.getIModelConnection()!;
    const elementprops = await imodel.elements.getProps(id);
    if (elementprops && elementprops.length > 0) {
      const eleProps = elementprops[0];
      const geom: GeometricElement3dProps = eleProps as GeometricElement3dProps;
      if (geom && geom.placement) {
        const place = geom.placement;
        if (place.bbox) {
          const box: Readonly<LowAndHighXYZ> = place.bbox;
          const ranger = Range3d.fromJSON(box);
          const origin = Point3d.fromJSON(place.origin);
          return {ranger,origin};
        }
      }
    }
    return null;
  }
    private Cal2Point3dDistance(p1:Point3d,p2:Point3d) {
    const dis = (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y) + (p1.z - p2.z) * (p1.z - p2.z);
    return Math.sqrt(dis);
  }
    private CalRangeMaxDistance(range: Range3d): number{
    //圆柱子;
    //const maxDistance = Math.max(range.low.x, range.low.y, range.high.x, range.high.y)/1.8;
    //方柱子;
    const maxDistance = Math.max(range.xLength(), range.yLength())/2;
    return maxDistance;
  }
}
