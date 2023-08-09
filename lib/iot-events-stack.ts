import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iotevents from 'aws-cdk-lib/aws-iotevents';
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

// iam policy document for detector model
const detectorModelPolicyDocument = new iam.PolicyDocument({
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
});

///* 諸々の定義ここまで * ///

export class IotEventsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // IAM Role for AWS IoT Events Detector Model
    const detectorModelRole = new iam.Role(this, detectorModelRoleName, {
      roleName: detectorModelRoleName,
      assumedBy: new iam.ServicePrincipal('iotevents.amazonaws.com'),
      inlinePolicies: {
        'detectorModelRoleNamePolicy': detectorModelPolicyDocument
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

    // AWS IoT Events Input
    const iotEventsInput = new iotevents.CfnInput(this, inputName, {
      inputName: inputName,
      inputDescription: 'sample input from cdk',
      inputDefinition: {
        attributes: inputAttributeProperties
      },
    });
  }
}

