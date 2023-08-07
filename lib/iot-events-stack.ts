import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iotevents from 'aws-cdk-lib/aws-iotevents';
import * as iam from 'aws-cdk-lib/aws-iam';


export class IotEventsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 定数定義
    const inputName = 'sample_task_input';
    const inputAttribute = [
      { jsonPath: 'sample_task.id' },
      { jsonPath: 'sample_task.title' },
      { jsonPath: 'sample_task.done' },
    ] as cdk.aws_iotevents.CfnInput.AttributeProperty[];

    // AWS IoT Events Input
    const iotEventsInput = new iotevents.CfnInput(this, inputName, {
      inputName: inputName,
      inputDescription: 'sample input from cdk',
      inputDefinition: {
        attributes: inputAttribute
      },
    });
  }
}
