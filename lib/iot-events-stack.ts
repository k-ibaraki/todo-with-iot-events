import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iotevents from 'aws-cdk-lib/aws-iotevents';
import * as iam from 'aws-cdk-lib/aws-iam';

// dotenv
import * as dotenv from 'dotenv';
dotenv.config();

const AWS_ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;

///* 諸々の定義 * ///

// input
const inputName = 'sample_task_input';
const inputAtts = {
  id: 'id',
  title: 'title',
  done: 'done',
};
const inputAttribute: cdk.aws_iotevents.CfnInput.AttributeProperty[] = Object.values(inputAtts).map(
  (att) => { return { "jsonPath": att } }
);

// detector model
const detectorModelRoleName = 'sample_task_detector_model_role';
const detectorModelRoleArn = `arn:aws:iam::${AWS_ACCOUNT_ID}:role/${detectorModelRoleName}`;
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



export class IotEventsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS IoT Events Input
    const iotEventsInput = new iotevents.CfnInput(this, inputName, {
      inputName: inputName,
      inputDescription: 'sample input from cdk',
      inputDefinition: {
        attributes: inputAttribute
      },
    });

    // AWS IoT Events Detector Model
    const detectorModel = new iotevents.CfnDetectorModel(this, detectorModelName, {
      detectorModelName: detectorModelName,
      detectorModelDescription: 'sample detector model from cdk',
      evaluationMethod: "SERIAL",
      key: 'sample_task.id',
      detectorModelDefinition: detectorModelDefinition,
      roleArn: detectorModelRoleArn,
    });
  }
}

