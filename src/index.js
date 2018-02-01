import generate from 'babel-generator';

const TAG = '[babel-plugin-functionly-annotations]';

export default function ({ types: t }) {
  return {
    visitor: {
      ClassDeclaration(path) {
        const node = path.node;
        const classRef = node.id;
        const classBody = node.body.body;

        // Create additional statements for parameter decorators and type annotations.
        let decorators = [];
        let types = [];
        classBody.forEach((bodyNode) => {
          if (bodyNode.type === 'ClassMethod') {
            decorators = parameterDecorators(bodyNode, classRef, decorators);
            types = parameterTypes(bodyNode.params, classRef);
          } else if (bodyNode.type === 'ClassProperty' && bodyNode.value === null && !bodyNode.static) {
            // Handle class property without initializer.
            // https://github.com/jeffmo/es-class-fields-and-static-properties
            bodyNode.value = t.memberExpression(t.thisExpression(), bodyNode.key);
          }
        });
        const additionalStatements = [...decorators, ...types].filter(Boolean);

        // If not found, do nothing.
        if (additionalStatements.length === 0) {
          return undefined;
        }

        // Append additional statements to program.
        const parent = path.parent;
        if (parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration') {
          // The class declaration is wrapped by an export declaration.
          path.parentPath.insertAfter(additionalStatements);
        } else {
          path.insertAfter(additionalStatements);
        }
      }
    }
  };

  // Returns an array of parameter decorator call statements for a class.
  function parameterDecorators(bodyNode, classRef, decorators) {
    const params = bodyNode.params;
    const isCtor = bodyNode.kind === 'constructor';
    const isStatic = bodyNode.static;

    const decoratorLists = params.map((param, i) => {
      const decorators = param.decorators;
      if (!decorators) {
        return [];
      }
      param.decorators = null;

      return decorators.map((decorator) => {
        const call = decorator.expression;
        const args = [
          isCtor || isStatic ? classRef : t.memberExpression(classRef, t.identifier('prototype')),
          isCtor ? t.identifier('undefined') : t.stringLiteral(bodyNode.key.loc.identifierName),
          t.identifier(i.toString())
        ];

        return t.expressionStatement(t.callExpression(call, args));
      });
    });
    // Flatten.
    return Array.prototype.concat.apply(decorators, decoratorLists);
  }

  // Returns an array of define 'parameters' metadata statements for a class.
  // The array may contain zero or one statements.
  function parameterTypes(params, classRef) {
    const types = params.map((param) => {
      const annotation = param.typeAnnotation && param.typeAnnotation.typeAnnotation;
      return typeForAnnotation(annotation);
    });
    if (!types.some(Boolean)) {
      return [];
    }
    return [defineMetadata('design:paramtypes', t.arrayExpression(types), classRef)];
  }

  // Returns an AST for define metadata statement.
  function defineMetadata(key, value, target) {
    return t.expressionStatement(t.callExpression(
      t.memberExpression(t.identifier('Reflect'), t.identifier('defineMetadata')),
      [t.stringLiteral(key), value, target]
    ));
  }

  function typeForAnnotation(annotation) {
    if (!annotation) {
      return null;
    }
    switch (annotation.type) {
      case 'StringTypeAnnotation':
        return t.identifier('String');
      case 'NumberTypeAnnotation':
        return t.identifier('Number');
      case 'BooleanTypeAnnotation':
        return t.identifier('Boolean');
      case 'VoidTypeAnnotation':
        return t.unaryExpression('void', t.numericLiteral(0));
      case 'GenericTypeAnnotation':
        if (annotation.typeParameters) {
          const genericCode = generate(annotation).code;
          const plainCode = generate(annotation.id).code;
          console.warn(`${TAG} Generic type is not supported: ${genericCode} Just use: ${plainCode}`);
        }
        return annotation.id;
      case 'ObjectTypeAnnotation':
        return t.identifier('Object');
      case 'FunctionTypeAnnotation':
        return t.identifier('Function');
      default:
        return null;
    }
  }
}
