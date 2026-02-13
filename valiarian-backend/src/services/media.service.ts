import {BindingScope, injectable} from '@loopback/core';
import {repository} from '@loopback/repository';
import {MediaRepository} from '../repositories';

@injectable({scope: BindingScope.TRANSIENT})
export class MediaService {
  constructor(
    @repository(MediaRepository)
    private mediaRepository: MediaRepository,
  ) { }

  // Media service methods will be implemented as part of task 5
  // This service is currently a placeholder for future media management functionality
}
