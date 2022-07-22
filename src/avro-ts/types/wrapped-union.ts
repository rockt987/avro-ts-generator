import { TypeLiteralNode, TypeNode } from 'typescript';
import { schema, Schema } from 'avsc';
import { Convert, Context } from '../types';
import { Type, mapWithContext, document } from '@ovotech/ts-compose';
import { isUnion } from './union';
import { isRecordType } from './record';
import { convertType } from '../convert';
import { fullName } from '../helpers';
import { isEnumType } from './enum';
import { isFixedType } from './fixed';

const resolveItem = (context: Context, item: Schema): Schema =>
  typeof item === 'string' && context.refs?.[item] ? context.refs?.[item] : item;

const isMatchItem = (resolvedItem: Schema, resolvedItemFromList: Schema): boolean => {
  if ( 
    typeof resolvedItem === 'object' && 'name' in resolvedItem 
    && typeof resolvedItemFromList === 'object' && 'name' in resolvedItemFromList
  ) {
    return resolvedItem.name === resolvedItemFromList.name;
  }
  return resolvedItem == resolvedItemFromList;
}

const getPropName = (schema: Schema, context: Context): string => {
  if (isRecordType(schema) || isEnumType(schema)) {
    return fullName(context, schema);
  } 
  if (isFixedType(schema)) {
    return `${context.namespace}.${schema.name}`;
  }
  if (typeof schema === 'object' && 'type' in schema) {
    return schema.type;
  }
  if (typeof schema === 'string') {
    return schema;
  }
  throw new Error(`Unknown props name for Schema:${JSON.stringify(schema)}`);
}

const convertTypeLiteral = (resolvedItem: Schema, convertType: TypeNode, resolvedList: Schema[], context: Context): TypeLiteralNode => {
    if (resolvedItem === 'null') {
      return Type.Null;
    }
    return Type.TypeLiteral({
      props: resolvedList.filter((item => item !== 'null')).map((resolvedItemFromList) => {
        const isPropForMainItem = isMatchItem(resolvedItem, resolvedItemFromList);
        const propName = getPropName(resolvedItemFromList, context);
        return Type.Prop({
            name: propName,
            isOptional: isPropForMainItem ? false : true,
            type: isPropForMainItem ? convertType : Type.Never,
          });
        }) 
    });
  }

type WrappedUnionItem = schema.RecordType
  | schema.PrimitiveType 
  | schema.ArrayType 
  | schema.EnumType 
  | schema.LogicalType 
  | schema.MapType 
  | schema.FixedType

export const isWrappedUnion = (type: Schema, context: Context): type is WrappedUnionItem[] =>
  isUnion(type) &&
  (
    context.neverUnwrapUnions ||
    (
      type.filter((item) => item !== 'null').length > 1 &&
      type.filter((item) => item !== 'null').every((item) => isRecordType(resolveItem(context, item)))
    )
  );

  export const convertWrappedUnionType: Convert<WrappedUnionItem[]> = (context, schema) => {
    const resolvedList = schema.map((item) => resolveItem(context, item) as WrappedUnionItem);
    const map = mapWithContext(context, schema, (itemContext, item) => {
      const converted = convertType(itemContext, item);
      const resolvedItem = resolveItem(context,item);
      return {
        context: { ...converted.context, namespace: context.namespace },
        type: convertTypeLiteral(resolvedItem, converted.type, resolvedList, context)
      };
    });
    return document(map.context, Type.Union(map.items));
  };
