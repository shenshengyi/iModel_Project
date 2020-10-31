/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Point3d, Range2d, Range3d } from "@bentley/geometry-core";
import { IModelApp, IModelConnection, ScreenViewport, ViewState } from "@bentley/imodeljs-frontend";
import { Button, ButtonSize, ButtonType, Select, Toggle } from "@bentley/ui-core";
import { ConfigurableCreateInfo, WidgetControl } from "@bentley/ui-framework";
import * as React from "react";
import "./common.scss";
import MarkerPinApp from "../../api/MarkerPinApp";
import { PlaceMarkerTool } from "../../api/PlaceMarkerTool";
import { PopupMenu } from "../../api/PopupMenu";
export abstract class BasePointGenerator {
  public abstract generatePoints(numPoints: number, range: Range2d): Point3d[];
}
export class TestWidget extends WidgetControl {
  constructor(info: ConfigurableCreateInfo, options: any) {
    super(info, options);
    if (options.iModelConnection) {
      this.reactNode =  <MarkerPinsUI />;
    }
  }
}
interface ManualPinSelection {
  name: string;
  image: string;
}

interface MarkerPinsUIState {
  imodel?: IModelConnection;
  showDecorator: boolean;
  manualPin: ManualPinSelection;
  points: Point3d[];
  range: Range2d;
  height: number;
}

export interface RadioCardEntry {
  image: string;
  value: string;
}
class MarkerPinsUI extends React.Component<{}, MarkerPinsUIState> {

  /** Creates a Sample instance */
  constructor(props?: any) {
    super(props);
    this.state = {
      showDecorator: true,
      manualPin: MarkerPinsUI.getManualPinSelections()[0],
      points: [],
      range: Range2d.createNull(),
      height: 0,
    };
  }

  public componentDidUpdate(_prevProps: {}, prevState: MarkerPinsUIState) {
    if (prevState.imodel !== this.state.imodel)
      if (this.state.showDecorator) {
        MarkerPinApp.setupDecorator(this.state.points);
        MarkerPinApp.enableDecorations();
      }

    if (prevState.points !== this.state.points) {
      if (MarkerPinApp.decoratorIsSetup())
        MarkerPinApp.setMarkerPoints(this.state.points);
    }
    if (prevState.showDecorator !== this.state.showDecorator) {
      if (this.state.showDecorator)
        MarkerPinApp.enableDecorations();
      else
        MarkerPinApp.disableDecorations();
    }
  }

  /** This callback will be executed when the user interacts with the PointSelector
   * UI component.  It is also called once when the component initializes.
   */
  private _onPointsChanged = async (points: Point3d[]): Promise<void> => {

    for (const point of points)
      point.z = this.state.height;

    this.setState({ points });
  }

  /** Called when the user changes the showMarkers toggle. */
  private _onChangeShowMarkers = (checked: boolean) => {
    if (checked) {
      this.setState({ showDecorator: true });
    } else {
      this.setState({ showDecorator: false });
    }
  }

  /** A static array of pin images. */
  private static getManualPinSelections(): ManualPinSelection[] {
    return ([
      { image: "Google_Maps_pin.svg", name: "Google Pin" },
      { image: "pin_celery.svg", name: "Celery Pin" },
      { image: "pin_poloblue.svg", name: "Polo blue Pin" }]);
  }

  /** Creates the array which populates the RadioCard UI component */
  private getMarkerList(): RadioCardEntry[] {
    return (MarkerPinsUI.getManualPinSelections().map((entry: ManualPinSelection) => ({ image: entry.image, value: entry.name })));
  }

  /** Called when the user clicks a new option in the RadioCard UI component */
  private _onManualPinChange = (name: string) => {
    const manualPin = MarkerPinsUI.getManualPinSelections().find((entry: ManualPinSelection) => entry.name === name)!;
    this.setState({ manualPin });
  }

  /** This callback will be executed by the PlaceMarkerTool when it is time to create a new marker */
  private _manuallyAddMarker = (point: Point3d) => {
    MarkerPinApp.addMarkerPoint(point, MarkerPinApp._images.get("Google_Maps_pin.svg")!);
  }

  /** This callback will be executed when the user clicks the UI button.  It will start the tool which
   * handles further user input.
   */
  private _onStartPlaceMarkerTool = () => {
    IModelApp.tools.run(PlaceMarkerTool.toolId, this._manuallyAddMarker);
  }

  /** This callback will be executed by ReloadableViewport to initialize the viewstate */
//   public static async getTopView(imodel: IModelConnection): Promise<ViewState> {
//     const viewState = await ViewSetup.getDefaultView(imodel);

//     // The marker pins look better in a top view
//     viewState.setStandardRotation(StandardViewId.Top);

//     const range = viewState.computeFitRange();
//     const aspect = viewState.getAspectRatio();

//     viewState.lookAtVolume(range, aspect);

//     return viewState;
//   }

  /** This callback will be executed by ReloadableViewport once the iModel has been loaded */
  private onIModelReady = (imodel: IModelConnection) => {
    IModelApp.viewManager.onViewOpen.addOnce((vp: ScreenViewport) => {

      // Grab range of the contents of the view. We'll use this to position the random markers.
      const range3d = vp.view.computeFitRange();
      const range = Range2d.createFrom(range3d);

      // Grab the max Z for the view contents.  We'll use this as the plane for the auto-generated markers. */
      const height = range3d.zHigh;

      this.setState({ imodel, range, height });
    });
  }

  /** Components for rendering the sample's instructions and controls */
  public getControls() {
    return (
      <>
        <PopupMenu />
        <div className="sample-options-2col">
            <span>Show Markers</span>
            <Button buttonType={ButtonType.Primary} onClick={this._onStartPlaceMarkerTool} title="place a new marker">Place Marker</Button>
          <Toggle isOn={this.state.showDecorator} onChange={this._onChangeShowMarkers} />
        </div>
        <hr></hr>
        <div className="sample-heading">
          <span>Auto-generate locations</span>
        </div>
        <div className="sample-options-2col">
          <PointSelector onPointsChanged={this._onPointsChanged} range={this.state.range} />
        </div>
        <hr></hr>
        <div className="sample-heading">
          <span>Manual placement</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <RadioCard entries={this.getMarkerList()} selected={this.state.manualPin.name} onChange={this._onManualPinChange} />
        </div>
      </>
    );
  }

  /** The sample's render method */
  public render() {
    return (
      <>
        <ControlPane instructions="Use the options below to control the marker pins.  Click a marker to open a menu of options." controls={this.getControls()} ></ControlPane></>
    );
  }
}

export class ControlPane extends React.Component<{ instructions: string, controls?: React.ReactNode, iModelSelector?: React.ReactNode }, { collapsed: boolean }> {

  public componentDidMount() {
    this.setState({ collapsed: false });
  }

  private switchCollapse() {
    const collapsed = !this.state.collapsed;
    this.setState({ collapsed });
  }

  public render() {
    if (this.state && this.state.collapsed) {
      return (
        <>
          <Button size={ButtonSize.Large} buttonType={ButtonType.Blue} className="show-control-pane-button" onClick={this.switchCollapse.bind(this)}>Show Control Pane</Button>
        </>
      );
    }
    return (
      <>
        <div className="sample-ui">
          <div className="control-pane-header">
            <div className="sample-instructions">
              <span>{this.props.instructions}</span>
            </div>
            <svg className="minimize-button control-pane-minimize" onClick={this.switchCollapse.bind(this)}>
              <use href="icons.svg#minimize"></use>
              <title>Minimize</title>
            </svg>
          </div>
          {this.props.iModelSelector ? this.props.iModelSelector : undefined}
          {this.props.controls ? <hr></hr> : undefined}
          {this.props.controls ? this.props.controls : undefined}
        </div>
      </>
    );
  }
}

export interface RadioCardEntry {
  image: string;
  value: string;
}

interface RadioCardProps {
  entries: RadioCardEntry[];
  selected: string;
  onChange: ((value: string) => void);
}
export class RadioCard extends React.Component<RadioCardProps, {}> {

  private _onCardSelected = (event: any) => {
    this.props.onChange(event.target.id);
  }

  private createElementsForCard(entry: RadioCardEntry, index: number, entries: RadioCardEntry[]) {
    let divClass = "card card-body";

    if (0 === index) {
      divClass += " card-first";
    } else if (entries.length - 1 === index) {
      divClass += " card-last";
    }

    const isChecked = this.props.selected === entry.value;

    return (
      <>
        <label className="card-radio-btn">
          <input type="radio" name="marker-types" className="card-input-element d-none" id={entry.value} checked={isChecked} onChange={this._onCardSelected} />
          <div className={divClass}>
            <div className="icon icon-status-success marker-pin-selection-icon"></div>
            <img src={entry.image} alt={entry.value} />
          </div>
        </label>
      </>
    );
  }

  public render() {
    return (
      <>
        <div className="card-radio">
          {this.props.entries.map((entry: RadioCardEntry, index, entries) => this.createElementsForCard(entry, index, entries))}
        </div>
      </>
    );
  }
}

/** React state of the PointSelector component */
export interface PointSelectorProps {
  onPointsChanged(points: Point3d[]): void;
  range?: Range2d;
}

/** React state of the PointSelector */
export interface PointSelectorState {
  pointGenerator: BasePointGenerator;
  pointCount: number;
}

/** A component that renders a point mode selector and a point count range input. */
export class PointSelector extends React.Component<PointSelectorProps, PointSelectorState> {

  /** Creates a PointSelector instance */
  constructor(props?: any) {
    super(props);
    this.state = {
      pointGenerator: new RandomPointGenerator(),
      pointCount: 10,
    };
  }

  public getPoints(): Point3d[] {
    if (undefined === this.props.range)
      return [];

    return this.state.pointGenerator.generatePoints(this.state.pointCount, this.props.range);
  }

  private notifyChange(): void {
    if (undefined === this.props.range)
      return;

    this.props.onPointsChanged(this.getPoints());
  }

  private _onChangePointMode = (event: React.ChangeEvent<HTMLSelectElement>) => {
    let pointGenerator: BasePointGenerator;

    switch (event.target.value) {
      case PointMode.Circle: { pointGenerator = new CirclePointGenerator(); break; }
      case PointMode.Cross: { pointGenerator = new CrossPointGenerator(); break; }
      default:
      case PointMode.Random: { pointGenerator = new RandomPointGenerator(); break; }
    }

    this.setState({ pointGenerator });
  }

  private _onChangePointCount = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ pointCount: Number(event.target.value) });
  }

  public componentDidMount() {
    this.notifyChange();
  }

  public componentDidUpdate(prevProps: PointSelectorProps, prevState: PointSelectorState) {
    if (undefined !== this.props.range && (this.props.range !== prevProps.range ||
      prevState.pointCount !== this.state.pointCount ||
      prevState.pointGenerator !== this.state.pointGenerator)) {
      this.notifyChange();
    }
  }

  /** The component's render method */
  public render() {
    return (
      <>
        <span>Points</span>
        <Select onChange={this._onChangePointMode} options={{ [PointMode.Random]: "Random", [PointMode.Circle]: "Circle", [PointMode.Cross]: "Cross" }} />
        <span>Point Count</span>
        <input type="range" min="1" max="500" value={this.state.pointCount} onChange={this._onChangePointCount}></input>
      </>
    );
  }
}
export enum PointMode {
  Random = "1",
  Circle = "2",
  Cross = "3",
}
export class CrossPointGenerator extends BasePointGenerator {

  private generateFractions(count: number): number[] {
    // Examples:
    // 1 === count: 1/2
    // 2 === count: 1/4, 3/4
    // 3 === count: 1/6, 3/6, 5/6
    // 4 === count: 1/8, 3/8, 5/8, 7/8
    return Array.from({ length: count }, (_el, i) => 1 / (2 * count) + i / count);
  }

  public generatePoints(numPoints: number, range: Range2d): Point3d[] {
    const points: Point3d[] = [];
    const range3d = Range3d.createRange2d(range);

    // Add half the points on the diagonal from lower left to upper right
    const count1 = Math.floor(numPoints / 2);
    const fractions1 = this.generateFractions(count1);

    for (const fraction of fractions1) {
      const point = range3d.fractionToPoint(fraction, fraction, 0);
      point.z = 1.0;
      points.push(point);
    }

    // Add the other half on the diagonal from upper left to the lower right
    const count2 = numPoints - count1;
    const fractions2 = this.generateFractions(count2);

    for (const fraction of fractions2) {
      const point = range3d.fractionToPoint(fraction, 1 - fraction, 0);
      point.z = 1.0;
      points.push(point);
    }

    return points;
  }
}
/** This is an extremely basic pseudo-random number generator.  We can't use
 * Math.random because it does not accept a seed, and we want the heatmap to
 * have consistent points within each session.  The lack of uniformity produced by
 * this simple algorithm is not important for the purposes of this sample.  There
 * are much better algorithms but this one is very concise.
 */
class BasicPRNG {
  private _startingSeed: number;
  private _seed: number;

  constructor(seed: number) {
    this._startingSeed = this._seed = seed;
  }

  public reset(): void {
    this._seed = this._startingSeed;
  }

  public random(): number {
    const x = Math.sin(this._seed++) * 10000;
    return x - Math.floor(x);
  }
}

/** Create an array of points arranged randomly within the range */
export class RandomPointGenerator extends BasePointGenerator {
  private _rng: BasicPRNG;

  constructor() {
    super();
    this._rng = new BasicPRNG(Math.random() * 10000);
  }

  public generatePoints(numPoints: number, range: Range2d): Point3d[] {
    const points: Point3d[] = [];
    const range3d = Range3d.createRange2d(range);

    for (let i = 0; i < numPoints; i++) {
      const point = range3d.fractionToPoint(this._rng.random(), this._rng.random(), 0);
      point.z = this._rng.random();
      points.push(point);
    }

    this._rng.reset();
    return points;
  }
}

/** Create an array of points arranged in a circle */
export class CirclePointGenerator extends BasePointGenerator {
  public generatePoints(numPoints: number, range: Range2d): Point3d[] {
    const points: Point3d[] = [];
    const radius: number = range.xLength() < range.yLength() ? range.xLength() * (2 / 5) : range.yLength() * (2 / 5);
    const range3d = Range3d.createRange2d(range);
    const midPt = range3d.center;

    for (let i = 0; i < numPoints; i++) {
      const angle = (2 * Math.PI) * (i / numPoints);
      const circlePt = new Point3d(radius * Math.cos(angle), radius * Math.sin(angle), 0.0);
      const point = circlePt.plus(midPt);
      point.z = (i + 1) / numPoints;

      points.push(point);
    }

    return points;
  }
}