import { AbstractNode, NodeMods, RenderOptions } from "./AbstractNode";
import { Path } from "../model/Path";
import { TreeView } from "../view/TreeView";
import { locale } from "../Registries";

/**
 * Boolean node with two buttons for true/false
 */
export class BooleanNode extends AbstractNode<boolean> {

  /**
   * @param mods optional node modifiers
   */
  constructor(mods?: NodeMods<boolean>) {
    super({
      default: () => false,
      ...mods})
  }

  renderRaw(path: Path, value: boolean, view: TreeView, options?: RenderOptions) {
    const falseButton = view.registerClick(el => {
      view.model.set(path, !this.force() && value === false ? undefined : false)
    })
    const trueButton = view.registerClick(el => {
      view.model.set(path, !this.force() && value === true ? undefined : true)
    })
    return `${options?.hideLabel ? `` : `<label>${locale(path)}</label>`}
      <button${value === false ? ' style="font-weight: bold"' : ' '} 
        data-id="${falseButton}">${locale('false')}</button>
      <button${value === true ? ' style="font-weight: bold"' : ' '} 
        data-id="${trueButton}">${locale('true')}</button>`
  }

  getClassName() {
    return 'boolean-node'
  }
}
