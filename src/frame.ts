import {ClosureObj} from './object';

export class Frame {
  public ip = -1;

  constructor(public cl: ClosureObj, public basePointer: number) {}

  instructions() {
    return this.cl.func.instructions;
  }
}
