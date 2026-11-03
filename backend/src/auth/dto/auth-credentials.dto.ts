import { ApiProperty } from '@nestjs/swagger'

export class AuthCredentialsDto {
  @ApiProperty({
    description: 'Unique registration username for the telemetry dashboard account',
    example: 'recruiter-tech-lead',
  })
  username!: string

  @ApiProperty({
    description: 'Secure raw user password used for cryptographic hash validation verification',
    example: 'SecurePass123!',
  })
  password!: string
}
