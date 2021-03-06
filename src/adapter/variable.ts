import { Log } from '../util/log';
import { ThreadAdapter, ObjectGripAdapter } from './index';
import { Variable } from 'vscode-debugadapter';

let log = Log.create('VariableAdapter');

export class VariableAdapter {

	private varname: string;
	private value: string;
	private _objectGripAdapter?: ObjectGripAdapter;

	public constructor(varname: string, value: string, objectGripAdapter?: ObjectGripAdapter) {
		this.varname = varname;
		this.value = value;
		this._objectGripAdapter = objectGripAdapter;
	}

	public getVariable(): Variable {
		return new Variable(this.varname, this.value, 
			this._objectGripAdapter ? this._objectGripAdapter.variablesProviderId : undefined);
	}

	public get objectGripAdapter(): ObjectGripAdapter | undefined {
		return this._objectGripAdapter;
	}

	public static fromGrip(varname: string, grip: FirefoxDebugProtocol.Grip, 
		threadLifetime: boolean, threadAdapter: ThreadAdapter): VariableAdapter {

		if ((typeof grip === 'boolean') || (typeof grip === 'number')) {

			return new VariableAdapter(varname, grip.toString());

		} else if (typeof grip === 'string') {

			return new VariableAdapter(varname, `"${grip}"`);

		} else {

			switch (grip.type) {

				case 'null':
				case 'undefined':
				case 'Infinity':
				case '-Infinity':
				case 'NaN':
				case '-0':

					return new VariableAdapter(varname, grip.type);

				case 'longString':

					return new VariableAdapter(varname, 
						(<FirefoxDebugProtocol.LongStringGrip>grip).initial);

				case 'symbol':

					return new VariableAdapter(varname,
						(<FirefoxDebugProtocol.SymbolGrip>grip).name);

				case 'object':

					let objectGrip = <FirefoxDebugProtocol.ObjectGrip>grip;
					let vartype = objectGrip.class;
					let objectGripAdapter = threadAdapter.getOrCreateObjectGripAdapter(objectGrip, threadLifetime);
					return new VariableAdapter(varname, vartype, objectGripAdapter);

				default:

					log.warn(`Unexpected object grip of type ${grip.type}: ${JSON.stringify(grip)}`);
					return new VariableAdapter(varname, grip.type);

			}
		}
	}

	public static fromPropertyDescriptor(varname: string, propertyDescriptor: FirefoxDebugProtocol.PropertyDescriptor, 
		threadLifetime: boolean, threadAdapter: ThreadAdapter): VariableAdapter {
			
		if ((<FirefoxDebugProtocol.DataPropertyDescriptor>propertyDescriptor).value !== undefined) {
			return VariableAdapter.fromGrip(varname, (<FirefoxDebugProtocol.DataPropertyDescriptor>propertyDescriptor).value, threadLifetime, threadAdapter);
		} else {
			return new VariableAdapter(varname, 'undefined');
		}
	}

	public static fromSafeGetterValueDescriptor(varname: string, 
		safeGetterValueDescriptor: FirefoxDebugProtocol.SafeGetterValueDescriptor, 
		threadLifetime: boolean, threadAdapter: ThreadAdapter): VariableAdapter {

		return VariableAdapter.fromGrip(varname, safeGetterValueDescriptor.getterValue, threadLifetime, threadAdapter);
	}

	public static sortVariables(variables: VariableAdapter[]): void {
		variables.sort((var1, var2) => VariableAdapter.compareStrings(var1.varname, var2.varname));
	}
	
	private static compareStrings(s1: string, s2: string): number {
		if (s1 < s2) {
			return -1;
		} else if (s1 === s2) {
			return 0;
		} else {
			return 1;
		}
	}
}
