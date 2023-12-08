function CheckAllPropertiesSet(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const result = originalMethod.apply(this, args);

    // Check if the returned object has the allPropertiesSet property
    if (result && typeof result === "object" && "allPropertiesSet" in result) {
      if (result.allPropertiesSet === false) {
        throw new Error(
          `Not all properties are set in the returned object from ${propertyKey}, the following are not set: ${result.propertiesNotSet.join(
            ", "
          )}`
        );
      }
    } else {
      console.warn(
        `The method ${propertyKey} did not return an object with an allPropertiesSet property`
      );
    }

    return { ...result };
  };

  return descriptor;
}

function TrackProps<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);

      // Define _propertySetStatus as a non-enumerable property
      Object.defineProperty(this, "_propertySetStatus", {
        value: {},
        enumerable: false,
        writable: true,
      });

      // Initialize tracking for each property
      for (const key in this) {
        if (["_propertySetStatus", "allPropertiesSet"].includes(key)) continue;
        if (this.hasOwnProperty(key)) {
          (this as any)._propertySetStatus[key] = false;

          // Create getter and setter for each property to track its set status
          let originalValue = this[key];
          Object.defineProperty(this, key, {
            get: () => originalValue,
            set: (newValue) => {
              originalValue = newValue;
              (this as any)._propertySetStatus[key] = true;
            },
            enumerable: true,
            configurable: true,
          });
        }
      }
    }

    // Dynamic property to check if all properties are set
    get allPropertiesSet(): boolean {
      return Object.values((this as any)._propertySetStatus).every(
        (status) => status
      );
    }
    get propertiesNotSet(): string[] {
      return Object.entries((this as any)._propertySetStatus)
        .filter(([_, status]) => !status)
        .map(([key, _]) => key);
    }
  };
}

@TrackProps
class UserEntityProps {
  firstName: string;
  lastName: string;
  birthday: Date;
  username: string;
  mentoringTopics: string[];
}

@TrackProps
class UserPersistence {
  FirstName: string;
  LastName: string;
  Birthday__c: Date;
  Username__c: string;
}

const user = new UserEntityProps();
user.firstName = "John";
user.lastName = "Doe";
user.birthday = new Date(1990, 1, 1);
user.username = "johndoe123";

class UserMapper {
  @CheckAllPropertiesSet
  static fromPersistence(persisted: UserPersistence): UserEntityProps {
    const user = new UserEntityProps();
    user.firstName = persisted.FirstName;
    user.lastName = persisted.LastName;
    user.birthday = persisted.Birthday__c;
    user.username = persisted.Username__c;
    return user;
  }

  @CheckAllPropertiesSet
  static toPersistence(user: UserEntityProps): UserPersistence {
    const persisted = new UserPersistence();
    persisted.FirstName = user.firstName;
    persisted.LastName = user.lastName;
    persisted.Birthday__c = user.birthday;
    persisted.Username__c = user.username;
    return persisted;
  }
}

const persistedUser = UserMapper.toPersistence(user);

const mappedBack = UserMapper.fromPersistence(persistedUser);

console.log(mappedBack);
