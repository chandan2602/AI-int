import {
  NG_VALUE_ACCESSOR
} from "./chunk-432OZ53O.js";
import {
  CommonModule
} from "./chunk-V5JKUS4W.js";
import {
  Component,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  NgModule,
  NgZone,
  Output,
  ViewChild,
  forwardRef,
  setClassMetadata,
  ɵɵInheritDefinitionFeature,
  ɵɵProvidersFeature,
  ɵɵdefineComponent,
  ɵɵdefineInjector,
  ɵɵdefineNgModule,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵloadQuery,
  ɵɵqueryRefresh,
  ɵɵviewQuery
} from "./chunk-Q4E5SNCJ.js";
import {
  fromEvent
} from "./chunk-4RMHXXWK.js";
import "./chunk-LFVCTHGI.js";
import "./chunk-AJN3JCM6.js";
import "./chunk-4KQ2WF6L.js";

// node_modules/ngx-monaco-editor-v2/fesm2022/ngx-monaco-editor-v2.mjs
var _c0 = ["editorContainer"];
var _c1 = "[_nghost-%COMP%]{display:block;height:200px}.editor-container[_ngcontent-%COMP%]{width:100%;height:98%}";
var NGX_MONACO_EDITOR_CONFIG = new InjectionToken("NGX_MONACO_EDITOR_CONFIG");
var loadedMonaco = false;
var loadPromise;
var BaseEditor = class _BaseEditor {
  set insideNg(insideNg) {
    this._insideNg = insideNg;
    if (this._editor) {
      this._editor.dispose();
      this.initMonaco(this._options, this.insideNg);
    }
  }
  get insideNg() {
    return this._insideNg;
  }
  constructor(config) {
    this.config = config;
    this.onInit = new EventEmitter();
    this._insideNg = false;
  }
  ngAfterViewInit() {
    if (loadedMonaco) {
      loadPromise.then(() => {
        this.initMonaco(this._options, this.insideNg);
      });
    } else {
      loadedMonaco = true;
      loadPromise = new Promise((resolve) => {
        const baseUrl = this.config.baseUrl || "./assets";
        if (typeof window.monaco === "object") {
          this.initMonaco(this._options, this.insideNg);
          resolve();
          return;
        }
        const onGotAmdLoader = (require2) => {
          let usedRequire = require2 || window.require;
          let requireConfig = {
            paths: {
              vs: `${baseUrl}/monaco/min/vs`
            }
          };
          Object.assign(requireConfig, this.config.requireConfig || {});
          usedRequire.config(requireConfig);
          usedRequire([`vs/editor/editor.main`], () => {
            if (typeof this.config.onMonacoLoad === "function") {
              this.config.onMonacoLoad();
            }
            this.initMonaco(this._options, this.insideNg);
            resolve();
          });
        };
        if (this.config.monacoRequire) {
          onGotAmdLoader(this.config.monacoRequire);
        } else if (!window.require) {
          const loaderScript = document.createElement("script");
          loaderScript.type = "text/javascript";
          loaderScript.src = `${baseUrl}/monaco/min/vs/loader.js`;
          loaderScript.addEventListener("load", () => {
            onGotAmdLoader();
          });
          document.body.appendChild(loaderScript);
        } else if (!window.require.config) {
          var src = `${baseUrl}/monaco/min/vs/loader.js`;
          var loaderRequest = new XMLHttpRequest();
          loaderRequest.addEventListener("load", () => {
            let scriptElem = document.createElement("script");
            scriptElem.type = "text/javascript";
            scriptElem.text = [
              // Monaco uses a custom amd loader that over-rides node's require.
              // Keep a reference to node's require so we can restore it after executing the amd loader file.
              "var nodeRequire = require;",
              loaderRequest.responseText.replace('"use strict";', ""),
              // Save Monaco's amd require and restore Node's require
              "var monacoAmdRequire = require;",
              "require = nodeRequire;",
              "require.nodeRequire = require;"
            ].join("\n");
            document.body.appendChild(scriptElem);
            onGotAmdLoader(window.monacoAmdRequire);
          });
          loaderRequest.open("GET", src);
          loaderRequest.send();
        } else {
          onGotAmdLoader();
        }
      });
    }
  }
  ngOnDestroy() {
    if (this._windowResizeSubscription) {
      this._windowResizeSubscription.unsubscribe();
    }
    if (this._editor) {
      this._editor.dispose();
      this._editor = void 0;
    }
  }
  static {
    this.ɵfac = function BaseEditor_Factory(t) {
      return new (t || _BaseEditor)(ɵɵdirectiveInject(NGX_MONACO_EDITOR_CONFIG));
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _BaseEditor,
      selectors: [["ng-component"]],
      viewQuery: function BaseEditor_Query(rf, ctx) {
        if (rf & 1) {
          ɵɵviewQuery(_c0, 7);
        }
        if (rf & 2) {
          let _t;
          ɵɵqueryRefresh(_t = ɵɵloadQuery()) && (ctx._editorContainer = _t.first);
        }
      },
      inputs: {
        insideNg: "insideNg"
      },
      outputs: {
        onInit: "onInit"
      },
      decls: 0,
      vars: 0,
      template: function BaseEditor_Template(rf, ctx) {
      },
      encapsulation: 2
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BaseEditor, [{
    type: Component,
    args: [{
      template: ""
    }]
  }], () => [{
    type: void 0,
    decorators: [{
      type: Inject,
      args: [NGX_MONACO_EDITOR_CONFIG]
    }]
  }], {
    insideNg: [{
      type: Input,
      args: ["insideNg"]
    }],
    _editorContainer: [{
      type: ViewChild,
      args: ["editorContainer", {
        static: true
      }]
    }],
    onInit: [{
      type: Output
    }]
  });
})();
var EditorComponent = class _EditorComponent extends BaseEditor {
  set options(options) {
    this._options = Object.assign({}, this.config.defaultOptions, options);
    if (this._editor) {
      this._editor.dispose();
      this.initMonaco(options, this.insideNg);
    }
  }
  get options() {
    return this._options;
  }
  set model(model) {
    this.options.model = model;
    if (this._editor) {
      this._editor.dispose();
      this.initMonaco(this.options, this.insideNg);
    }
  }
  constructor(zone, editorConfig) {
    super(editorConfig);
    this.zone = zone;
    this.editorConfig = editorConfig;
    this._value = "";
    this.propagateChange = (_) => {
    };
    this.onTouched = () => {
    };
  }
  writeValue(value) {
    this._value = value || "";
    setTimeout(() => {
      if (this._editor && !this.options.model) {
        this._editor.setValue(this._value);
      }
    });
  }
  registerOnChange(fn) {
    this.propagateChange = fn;
  }
  registerOnTouched(fn) {
    this.onTouched = fn;
  }
  initMonaco(options, insideNg) {
    const hasModel = !!options.model;
    if (hasModel) {
      const model = monaco.editor.getModel(options.model.uri || "");
      if (model) {
        options.model = model;
        options.model.setValue(this._value);
      } else {
        options.model = monaco.editor.createModel(options.model.value, options.model.language, options.model.uri);
      }
    }
    if (insideNg) {
      this._editor = monaco.editor.create(this._editorContainer.nativeElement, options);
    } else {
      this.zone.runOutsideAngular(() => {
        this._editor = monaco.editor.create(this._editorContainer.nativeElement, options);
      });
    }
    if (!hasModel) {
      this._editor.setValue(this._value);
    }
    this._editor.onDidChangeModelContent((e) => {
      const value = this._editor.getValue();
      this.zone.run(() => {
        this.propagateChange(value);
        this._value = value;
      });
    });
    this._editor.onDidBlurEditorWidget(() => {
      this.onTouched();
    });
    if (this._windowResizeSubscription) {
      this._windowResizeSubscription.unsubscribe();
    }
    this._windowResizeSubscription = fromEvent(window, "resize").subscribe(() => this._editor.layout());
    this.onInit.emit(this._editor);
  }
  static {
    this.ɵfac = function EditorComponent_Factory(t) {
      return new (t || _EditorComponent)(ɵɵdirectiveInject(NgZone), ɵɵdirectiveInject(NGX_MONACO_EDITOR_CONFIG));
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _EditorComponent,
      selectors: [["ngx-monaco-editor"]],
      inputs: {
        options: "options",
        model: "model"
      },
      features: [ɵɵProvidersFeature([{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => _EditorComponent),
        multi: true
      }]), ɵɵInheritDefinitionFeature],
      decls: 2,
      vars: 0,
      consts: [["editorContainer", ""], [1, "editor-container"]],
      template: function EditorComponent_Template(rf, ctx) {
        if (rf & 1) {
          ɵɵelement(0, "div", 1, 0);
        }
      },
      styles: ["[_nghost-%COMP%]{display:block;height:200px}.editor-container[_ngcontent-%COMP%]{width:100%;height:98%}"]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(EditorComponent, [{
    type: Component,
    args: [{
      selector: "ngx-monaco-editor",
      template: '<div class="editor-container" #editorContainer></div>',
      providers: [{
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => EditorComponent),
        multi: true
      }],
      styles: [":host{display:block;height:200px}.editor-container{width:100%;height:98%}\n"]
    }]
  }], () => [{
    type: NgZone
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [NGX_MONACO_EDITOR_CONFIG]
    }]
  }], {
    options: [{
      type: Input,
      args: ["options"]
    }],
    model: [{
      type: Input,
      args: ["model"]
    }]
  });
})();
var DiffEditorComponent = class _DiffEditorComponent extends BaseEditor {
  set options(options) {
    this._options = Object.assign({}, this.config.defaultOptions, options);
    if (this._editor) {
      this._editor.dispose();
      this.initMonaco(options, this.insideNg);
    }
  }
  get options() {
    return this._options;
  }
  set originalModel(model) {
    this._originalModel = model;
    if (this._editor) {
      this._editor.dispose();
      this.initMonaco(this.options, this.insideNg);
    }
  }
  set modifiedModel(model) {
    this._modifiedModel = model;
    if (this._editor) {
      this._editor.dispose();
      this.initMonaco(this.options, this.insideNg);
    }
  }
  constructor(zone, editorConfig) {
    super(editorConfig);
    this.zone = zone;
    this.editorConfig = editorConfig;
  }
  initMonaco(options, insideNg) {
    if (!this._originalModel || !this._modifiedModel) {
      throw new Error("originalModel or modifiedModel not found for ngx-monaco-diff-editor");
    }
    this._originalModel.language = this._originalModel.language || options.language;
    this._modifiedModel.language = this._modifiedModel.language || options.language;
    let originalModel = monaco.editor.createModel(this._originalModel.code, this._originalModel.language);
    let modifiedModel = monaco.editor.createModel(this._modifiedModel.code, this._modifiedModel.language);
    this._editorContainer.nativeElement.innerHTML = "";
    const theme = options.theme;
    if (insideNg) {
      this._editor = monaco.editor.createDiffEditor(this._editorContainer.nativeElement, options);
    } else {
      this.zone.runOutsideAngular(() => {
        this._editor = monaco.editor.createDiffEditor(this._editorContainer.nativeElement, options);
      });
    }
    options.theme = theme;
    this._editor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
    if (this._windowResizeSubscription) {
      this._windowResizeSubscription.unsubscribe();
    }
    this._windowResizeSubscription = fromEvent(window, "resize").subscribe(() => this._editor.layout());
    this.onInit.emit(this._editor);
  }
  static {
    this.ɵfac = function DiffEditorComponent_Factory(t) {
      return new (t || _DiffEditorComponent)(ɵɵdirectiveInject(NgZone), ɵɵdirectiveInject(NGX_MONACO_EDITOR_CONFIG));
    };
  }
  static {
    this.ɵcmp = ɵɵdefineComponent({
      type: _DiffEditorComponent,
      selectors: [["ngx-monaco-diff-editor"]],
      inputs: {
        options: "options",
        originalModel: "originalModel",
        modifiedModel: "modifiedModel"
      },
      features: [ɵɵInheritDefinitionFeature],
      decls: 2,
      vars: 0,
      consts: [["editorContainer", ""], [1, "editor-container"]],
      template: function DiffEditorComponent_Template(rf, ctx) {
        if (rf & 1) {
          ɵɵelement(0, "div", 1, 0);
        }
      },
      styles: [_c1]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DiffEditorComponent, [{
    type: Component,
    args: [{
      selector: "ngx-monaco-diff-editor",
      template: '<div class="editor-container" #editorContainer></div>',
      styles: [":host{display:block;height:200px}.editor-container{width:100%;height:98%}\n"]
    }]
  }], () => [{
    type: NgZone
  }, {
    type: void 0,
    decorators: [{
      type: Inject,
      args: [NGX_MONACO_EDITOR_CONFIG]
    }]
  }], {
    options: [{
      type: Input,
      args: ["options"]
    }],
    originalModel: [{
      type: Input,
      args: ["originalModel"]
    }],
    modifiedModel: [{
      type: Input,
      args: ["modifiedModel"]
    }]
  });
})();
var MonacoEditorModule = class _MonacoEditorModule {
  static forRoot(config = {}) {
    return {
      ngModule: _MonacoEditorModule,
      providers: [{
        provide: NGX_MONACO_EDITOR_CONFIG,
        useValue: config
      }]
    };
  }
  static {
    this.ɵfac = function MonacoEditorModule_Factory(t) {
      return new (t || _MonacoEditorModule)();
    };
  }
  static {
    this.ɵmod = ɵɵdefineNgModule({
      type: _MonacoEditorModule,
      declarations: [EditorComponent, DiffEditorComponent],
      imports: [CommonModule],
      exports: [EditorComponent, DiffEditorComponent]
    });
  }
  static {
    this.ɵinj = ɵɵdefineInjector({
      imports: [CommonModule]
    });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MonacoEditorModule, [{
    type: NgModule,
    args: [{
      imports: [CommonModule],
      declarations: [EditorComponent, DiffEditorComponent],
      exports: [EditorComponent, DiffEditorComponent]
    }]
  }], null, null);
})();
export {
  DiffEditorComponent,
  EditorComponent,
  MonacoEditorModule,
  NGX_MONACO_EDITOR_CONFIG
};
//# sourceMappingURL=ngx-monaco-editor-v2.js.map
