import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iotevents from 'aws-cdk-lib/aws-iotevents';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';

// dotenv
import * as dotenv from 'dotenv';
dotenv.config();

///* 諸々の定義 * ///

// iot events input
const inputName = 'sample_task_input';
const inputAtts = {
  id: 'id',
  title: 'title',
  done: 'done',
} as const;
const inputAttributeProperties: cdk.aws_iotevents.CfnInput.AttributeProperty[] = Object.values(inputAtts).map(
  (att) => { return { "jsonPath": att } }
);

// iot events detector model
const detectorModelRoleName = 'sample_task_detector_model_role';
const detectorModelName = 'sample_task_detector_model';
const detectorModelDefinition = {
  states: [
    {
      stateName: "todo",
      onInput: {
        events: [
          {
            eventName: "setTitle",
            condition: `! isUndefined( $input.${inputName}.${inputAtts.title} )`,
            actions: [
              {
                setVariable: {
                  variableName: inputAtts.title,
                  value: `$input.${inputName}.${inputAtts.title}`,
                },
              },
            ],
          },
        ],
        transitionEvents: [
          {
            eventName: "do",
            condition: `$input.${inputName}.${inputAtts.done} == true`,
            actions: [],
            nextState: "done",
          },
        ],
      },
      onEnter: {
        events: [
          {
            eventName: "setDefaultTitle",
            condition: `isUndefined( $input.${inputName}.${inputAtts.title} )`,
            actions: [
              {
                setVariable: {
                  variableName: inputAtts.title,
                  value: `'task' + convert (String, $input.${inputName}.${inputAtts.id})`,
                }
              },
            ],
          },
        ],
      },
      onExit: {
        events: [],
      }
    },
    {
      stateName: "done",
      onInput: {
        events: [],
        transitionEvents: [],
      },
      onEnter: {
        events: [],
      },
      onExit: {
        events: [],
      }
    }
  ],
  initialStateName: "todo",
};

// iot rule
const iotRuleName = 'sample_task_iot_events_rule';
const iotRuleTopic = 'sample/iot_events/task';
const iotRuleRoleName = 'sample_task_iot_events_rule_role';
///* 諸々の定義ここまで * ///

export class IotEventsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS IoT Events Input
    const iotEventsInput = new iotevents.CfnInput(this, inputName, {
      inputName: inputName,
      inputDescription: 'sample input from cdk',
      inputDefinition: {
        attributes: inputAttributeProperties
      },
    });

    // IAM Role for AWS IoT Events Detector Model
    const detectorModelRole = new iam.Role(this, detectorModelRoleName, {
      roleName: detectorModelRoleName,
      assumedBy: new iam.ServicePrincipal('iotevents.amazonaws.com'),
      inlinePolicies: {
        detectorModelPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['iotevents:*'],
              resources: ['*'],
            }),
            new iam.PolicyStatement({
              actions: ['lambda:InvokeFunction'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // AWS IoT Events Detector Model
    const detectorModel = new iotevents.CfnDetectorModel(this, detectorModelName, {
      detectorModelName: detectorModelName,
      detectorModelDescription: 'sample detector model from cdk',
      evaluationMethod: "SERIAL",
      key: `${inputAtts.id}`,
      detectorModelDefinition: detectorModelDefinition,
      roleArn: detectorModelRole.roleArn,
    });

    // IAM Role for AWS IoT Rule 
    const iotRuleRole = new iam.Role(this, iotRuleRoleName, {
      roleName: iotRuleRoleName,
      assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
      inlinePolicies: {
        iotRuleRolePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ['iotevents:BatchPutMessage'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // AWS IoT Rule
    const iotRule = new iot.CfnTopicRule(this, iotRuleName, {
      ruleName: iotRuleName,

      topicRulePayload: {
        sql: `SELECT * FROM '${iotRuleTopic}'`,
        description: "sample rule from cdk",
        actions: [
          {
            iotEvents: {
              inputName: iotEventsInput.inputName ?? '',
              roleArn: iotRuleRole.roleArn,
            },
          },
        ],
      },
    });
  }
}